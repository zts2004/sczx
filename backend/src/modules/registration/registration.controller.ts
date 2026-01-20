import { Request, Response, NextFunction } from 'express';
import prisma from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import fs from 'fs/promises';
import path from 'path';

export class RegistrationController {
  // 提交报名
  static async createRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { competitionId, registrationData, attachments } = req.body;

      if (!competitionId) {
        throw new AppError('竞赛ID为必填项', 400);
      }

      // 检查竞赛是否存在
      const competition = await prisma.competition.findUnique({
        where: { id: competitionId },
      });

      if (!competition) {
        throw new AppError('竞赛不存在', 404);
      }

      // 检查报名时间
      const now = new Date();
      if (now < competition.registrationStart || now > competition.registrationEnd) {
        throw new AppError('不在报名时间内', 400);
      }

      // 检查是否已报名
      const existingRegistration = await prisma.registration.findUnique({
        where: {
          userId_competitionId: {
            userId,
            competitionId,
          },
        },
      });

      if (existingRegistration) {
        throw new AppError('您已经报名过该竞赛', 400);
      }

      // 检查报名人数限制
      if (competition.maxParticipants > 0) {
        const currentCount = await prisma.registration.count({
          where: {
            competitionId,
            status: 'approved',
          },
        });

        if (currentCount >= competition.maxParticipants) {
          throw new AppError('报名人数已满', 400);
        }
      }

      // 创建报名记录
      const registration = await prisma.registration.create({
        data: {
          userId,
          competitionId,
          registrationData: registrationData ? JSON.parse(JSON.stringify(registrationData)) : null,
          attachments: attachments ? JSON.parse(JSON.stringify(attachments)) : null,
          status: 'pending',
        },
        include: {
          competition: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: '报名提交成功，等待审核',
        data: registration,
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取我的报名记录
  static async getMyRegistrations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page = '1', limit = '10', status } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { userId };
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
            competition: {
              select: {
                id: true,
                title: true,
                type: true,
                coverImage: true,
                startTime: true,
                endTime: true,
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

  // 获取报名详情
  static async getRegistrationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const registration = await prisma.registration.findUnique({
        where: { id: parseInt(id) },
        include: {
          competition: true,
          user: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
        },
      });

      if (!registration) {
        throw new AppError('报名记录不存在', 404);
      }

      // 检查权限（只能查看自己的报名，或管理员可以查看所有）
      if (registration.userId !== userId && req.user!.role === 'user') {
        throw new AppError('无权访问', 403);
      }

      res.json({
        success: true,
        data: registration,
      });
    } catch (error) {
      next(error);
    }
  }

  // 取消报名
  static async cancelRegistration(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const registration = await prisma.registration.findUnique({
        where: { id: parseInt(id) },
      });

      if (!registration) {
        throw new AppError('报名记录不存在', 404);
      }

      if (registration.userId !== userId) {
        throw new AppError('无权操作', 403);
      }

      if (registration.status === 'cancelled') {
        throw new AppError('报名已取消', 400);
      }

      await prisma.registration.update({
        where: { id: parseInt(id) },
        data: { status: 'cancelled' },
      });

      res.json({
        success: true,
        message: '报名已取消',
      });
    } catch (error) {
      next(error);
    }
  }

  // 上传参赛材料（报名后）
  static async uploadMaterials(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const files = (req as any).files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        throw new AppError('请至少上传一个文件', 400);
      }

      const reg = await prisma.registration.findUnique({
        where: { id: parseInt(id) },
        include: {
          competition: { select: { id: true, title: true } },
          user: { select: { id: true } },
        },
      });
      if (!reg) throw new AppError('报名记录不存在', 404);
      if (reg.userId !== userId) throw new AppError('无权操作', 403);

      const competitionId = reg.competitionId;
      const destDir = path.resolve(process.cwd(), 'uploads', 'materials', String(competitionId), String(userId));
      await fs.mkdir(destDir, { recursive: true });

      const allowed = new Set([
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
        'application/x-zip-compressed',
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);

      const moved: any[] = [];
      for (const f of files) {
        if (!allowed.has(f.mimetype)) {
          // 清理不合法文件
          await fs.unlink(f.path).catch(() => undefined);
          throw new AppError(`不支持的文件类型：${f.originalname}`, 400);
        }

        const targetPath = path.join(destDir, f.filename);
        await fs.rename(f.path, targetPath);

        const publicUrl = `/uploads/materials/${competitionId}/${userId}/${f.filename}`.replace(/\\/g, '/');
        moved.push({
          originalName: f.originalname,
          filename: f.filename,
          mime: f.mimetype,
          size: f.size,
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
        });
      }

      const existing = (reg.attachments as any) || [];
      const nextAttachments = Array.isArray(existing) ? [...existing, ...moved] : moved;

      const updated = await prisma.registration.update({
        where: { id: reg.id },
        data: { attachments: nextAttachments },
        select: { id: true, attachments: true, status: true, createdAt: true },
      });

      res.json({
        success: true,
        message: '参赛材料上传成功',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
