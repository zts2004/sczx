import { Request, Response, NextFunction } from 'express';
import prisma from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import ExcelJS from 'exceljs';
import { createAndPushNotification } from '../../utils/notify';
import { toPublicUploadUrl } from '../../utils/upload';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

export class AdminController {
  // 导出某比赛全部参赛材料为 ZIP
  static async exportCompetitionMaterialsZip(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.params;
      const compId = Number(competitionId);
      if (!compId || Number.isNaN(compId)) throw new AppError('无效的竞赛ID', 400);

      const competition = await prisma.competition.findUnique({
        where: { id: compId },
        select: { id: true, title: true },
      });
      if (!competition) throw new AppError('竞赛不存在', 404);

      const regs = await prisma.registration.findMany({
        where: { competitionId: compId },
        include: {
          user: { select: { id: true, realName: true, username: true, studentId: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      const safe = (s: string) =>
        String(s || '')
          .replace(/[\\/:*?"<>|]/g, '_')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 80);

      const rootFolder = safe(competition.title || `competition-${compId}`);

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${rootFolder}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        throw err;
      });
      archive.pipe(res);

      for (const r of regs) {
        const list = (r.attachments as any) || [];
        if (!Array.isArray(list) || list.length === 0) continue;

        const displayName = r.user.realName || r.user.username || `user-${r.user.id}`;
        const folderName = safe(`${displayName}_${r.user.studentId || r.user.id}`);

        for (const f of list) {
          const url = typeof f?.url === 'string' ? f.url : '';
          if (!url.startsWith('/uploads/')) continue;
          const rel = url.replace(/^\/uploads\//, '');
          const diskPath = path.resolve(process.cwd(), 'uploads', rel);
          if (!fs.existsSync(diskPath)) continue;

          const fileNameInZip = safe(f.originalName || path.basename(diskPath));
          archive.file(diskPath, { name: `${rootFolder}/${folderName}/${fileNameInZip}` });
        }
      }

      await archive.finalize();
    } catch (error) {
      next(error);
    }
  }
  // 获取用户列表（管理员）
  static async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search, role } = req.query as any;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (role) where.role = role;
      if (search) {
        where.OR = [
          { username: { contains: String(search), mode: 'insensitive' } },
          { email: { contains: String(search), mode: 'insensitive' } },
          { realName: { contains: String(search), mode: 'insensitive' } },
          { studentId: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            username: true,
            studentId: true,
            email: true,
            realName: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 修改用户角色（指定用户为管理员）
  static async updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const actor = req.user!;
      const { id } = req.params;
      const { role } = req.body as { role?: string };

      if (!role || !['user', 'admin', 'super_admin'].includes(role)) {
        throw new AppError('无效的角色', 400);
      }

      const targetId = parseInt(id);
      if (Number.isNaN(targetId)) {
        throw new AppError('无效的用户ID', 400);
      }

      // 权限规则：
      // - admin：只能把 user <-> admin（不能授予 super_admin，也不能修改 super_admin）
      // - super_admin：可设置 user/admin/super_admin
      if (actor.role === 'admin') {
        if (role === 'super_admin') {
          throw new AppError('只有超级管理员可以授予超级管理员权限', 403);
        }
      }

      const target = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, role: true, username: true, email: true },
      });
      if (!target) {
        throw new AppError('用户不存在', 404);
      }

      if (actor.role === 'admin' && target.role === 'super_admin') {
        throw new AppError('管理员不能修改超级管理员账号', 403);
      }

      // 防止把自己降权导致锁死（可按需取消）
      if (actor.id === targetId && actor.role === 'super_admin' && role !== 'super_admin') {
        throw new AppError('超级管理员不能在此接口中降低自己的权限', 400);
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: { role },
        select: {
          id: true,
          username: true,
          studentId: true,
          email: true,
          role: true,
          status: true,
        },
      });

      res.json({ success: true, message: '角色已更新', data: updated });
    } catch (error) {
      next(error);
    }
  }
  // 审核报名
  static async reviewRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        throw new AppError('无效的审核状态', 400);
      }

      const registration = await prisma.registration.findUnique({
        where: { id: parseInt(id) },
        include: { competition: true },
      });

      if (!registration) {
        throw new AppError('报名记录不存在', 404);
      }

      // 更新报名状态
      const updatedRegistration = await prisma.registration.update({
        where: { id: parseInt(id) },
        data: {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });

      // 如果审核通过，更新竞赛报名人数
      if (status === 'approved') {
        await prisma.competition.update({
          where: { id: registration.competitionId },
          data: {
            currentParticipants: {
              increment: 1,
            },
          },
        });
      }

      // 创建通知
      await createAndPushNotification({
        userId: registration.userId,
        type: 'registration_review',
        title: '报名审核结果',
        content: `您的报名"${registration.competition.title}"已${status === 'approved' ? '通过' : '拒绝'}审核`,
      });

      res.json({
        success: true,
        message: '审核完成',
        data: updatedRegistration,
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取竞赛的所有报名
  static async getCompetitionRegistrations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { competitionId } = req.params;
      const { page = '1', limit = '20', status } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { competitionId: parseInt(competitionId) };
      if (status) {
        where.status = status;
      }

      const [registrations, total] = await Promise.all([
        prisma.registration.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                realName: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        prisma.registration.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          registrations,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 发放院级获奖证书
  static async issueCollegeCertificate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const {
        userId,
        competitionId,
        awardName,
        awardRank,
        awardTime,
        certificateImage, // 兼容旧的 URL 方式
        description,
      } = req.body;

      if (!userId || !awardName || !awardTime) {
        throw new AppError('用户ID、证书名称和时间为必填项', 400);
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      const finalCertificateUrl =
        (typeof certificateImage === 'string' && certificateImage.trim().length > 0
          ? certificateImage.trim()
          : null) || (file ? toPublicUploadUrl('certificates', file.filename) : null);

      if (!finalCertificateUrl) {
        throw new AppError('证书文件为必填项（支持上传 pdf/图片，或填写 URL）', 400);
      }

      // 生成证书编号
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const certificateNumber = `COLLEGE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${random.toString().padStart(4, '0')}`;

      // 创建院级获奖记录
      const award = await prisma.award.create({
        data: {
          userId,
          competitionId: competitionId || null,
          awardLevel: 'college',
          awardName,
          awardRank,
          awardTime: new Date(awardTime),
          certificateImage: finalCertificateUrl,
          certificateNumber,
          description,
          status: 'approved', // 院级证书直接通过
          issuedBy: adminId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
          competition: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // 创建通知
      await createAndPushNotification({
        userId,
        type: 'certificate_issued',
        title: '院级获奖证书',
        content: `您已获得院级获奖证书：${awardName}`,
      });

      res.status(201).json({
        success: true,
        message: '证书发放成功',
        data: award,
      });
    } catch (error) {
      next(error);
    }
  }

  // 审核获奖图片
  static async reviewAward(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const { status, reviewNotes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        throw new AppError('无效的审核状态', 400);
      }

      const award = await prisma.award.findUnique({
        where: { id: parseInt(id) },
      });

      if (!award) {
        throw new AppError('获奖记录不存在', 404);
      }

      // 只能审核校级/省级/国家级
      if (award.awardLevel === 'college') {
        throw new AppError('院级证书无需审核', 400);
      }

      const updatedAward = await prisma.award.update({
        where: { id: parseInt(id) },
        data: {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes,
        },
      });

      // 创建通知
      await createAndPushNotification({
        userId: award.userId,
        type: 'award_review',
        title: '获奖审核结果',
        content: `您的获奖记录"${award.awardName}"已${status === 'approved' ? '通过' : '拒绝'}审核`,
      });

      res.json({
        success: true,
        message: '审核完成',
        data: updatedAward,
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取所有获奖记录（管理员）
  static async getAllAwards(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', awardLevel, status } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (awardLevel) {
        where.awardLevel = awardLevel;
      }
      if (status) {
        where.status = status;
      }

      const [awards, total] = await Promise.all([
        prisma.award.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
            competition: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        }),
        prisma.award.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          awards,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取统计数据
  static async getStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const [
        totalUsers,
        totalCompetitions,
        totalRegistrations,
        totalAwards,
        awardsByLevel,
        registrationsByStatus,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.competition.count(),
        prisma.registration.count(),
        prisma.award.count(),
        prisma.award.groupBy({
          by: ['awardLevel'],
          _count: true,
        }),
        prisma.registration.groupBy({
          by: ['status'],
          _count: true,
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalCompetitions,
          totalRegistrations,
          totalAwards,
          awardsByLevel,
          registrationsByStatus,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 导出获奖数据（Excel）
  static async exportAwardsExcel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { awardLevel, status } = req.query as any;

      const where: any = {};
      if (awardLevel) where.awardLevel = awardLevel;
      if (status) where.status = status;

      const awards = await prisma.award.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, realName: true, email: true, studentId: true } },
          competition: { select: { id: true, title: true } },
        },
      });

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('awards');
      ws.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: '用户ID', key: 'userId', width: 10 },
        { header: '用户名', key: 'username', width: 16 },
        { header: '真实姓名', key: 'realName', width: 16 },
        { header: '学号', key: 'studentId', width: 16 },
        { header: '邮箱', key: 'email', width: 24 },
        { header: '竞赛ID', key: 'competitionId', width: 10 },
        { header: '竞赛名称', key: 'competitionTitle', width: 24 },
        { header: '获奖级别', key: 'awardLevel', width: 12 },
        { header: '获奖名称', key: 'awardName', width: 28 },
        { header: '获奖等级', key: 'awardRank', width: 12 },
        { header: '获奖时间', key: 'awardTime', width: 20 },
        { header: '状态', key: 'status', width: 10 },
        { header: '证书编号', key: 'certificateNumber', width: 22 },
        { header: '证书图片', key: 'certificateImage', width: 40 },
        { header: '备注', key: 'reviewNotes', width: 30 },
        { header: '创建时间', key: 'createdAt', width: 20 },
      ];

      awards.forEach((a) => {
        ws.addRow({
          id: a.id,
          userId: a.userId,
          username: a.user.username,
          realName: a.user.realName || '',
          studentId: a.user.studentId || '',
          email: a.user.email,
          competitionId: a.competitionId ?? '',
          competitionTitle: a.competition?.title || '',
          awardLevel: a.awardLevel,
          awardName: a.awardName,
          awardRank: a.awardRank || '',
          awardTime: a.awardTime.toISOString(),
          status: a.status,
          certificateNumber: a.certificateNumber || '',
          certificateImage: a.certificateImage || '',
          reviewNotes: a.reviewNotes || '',
          createdAt: a.createdAt.toISOString(),
        });
      });

      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      const filename = `awards-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await wb.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }

  // 导出报名数据（Excel）
  static async exportRegistrationsExcel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { competitionId, status } = req.query as any;

      const where: any = {};
      if (competitionId) where.competitionId = Number(competitionId);
      if (status) where.status = status;

      const regs = await prisma.registration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, realName: true, email: true, phone: true, studentId: true } },
          competition: { select: { id: true, title: true } },
        },
      });

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('registrations');
      ws.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: '竞赛ID', key: 'competitionId', width: 10 },
        { header: '竞赛名称', key: 'competitionTitle', width: 26 },
        { header: '用户ID', key: 'userId', width: 10 },
        { header: '用户名', key: 'username', width: 16 },
        { header: '真实姓名', key: 'realName', width: 16 },
        { header: '学号', key: 'studentId', width: 16 },
        { header: '邮箱', key: 'email', width: 24 },
        { header: '手机号', key: 'phone', width: 16 },
        { header: '状态', key: 'status', width: 10 },
        { header: '审核备注', key: 'reviewNotes', width: 30 },
        { header: '报名时间', key: 'createdAt', width: 20 },
      ];

      regs.forEach((r) => {
        ws.addRow({
          id: r.id,
          competitionId: r.competitionId,
          competitionTitle: r.competition.title,
          userId: r.userId,
          username: r.user.username,
          realName: r.user.realName || '',
          studentId: r.user.studentId || '',
          email: r.user.email,
          phone: r.user.phone || '',
          status: r.status,
          reviewNotes: r.reviewNotes || '',
          createdAt: r.createdAt.toISOString(),
        });
      });

      ws.getRow(1).font = { bold: true };
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      const filename = `registrations-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      await wb.xlsx.write(res);
      res.end();
    } catch (error) {
      next(error);
    }
  }
}
