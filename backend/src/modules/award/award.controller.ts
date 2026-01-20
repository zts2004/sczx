import { Request, Response, NextFunction } from 'express';
import prisma from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';
import { toPublicUploadUrl } from '../../utils/upload';

export class AwardController {
  // 上传获奖图片（用户）
  static async createAward(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const {
        competitionId,
        awardLevel,
        awardName,
        awardRank,
        awardTime,
        certificateImage, // 兼容旧的 URL 提交方式
        description,
      } = req.body;

      // 验证必填字段
      if (!awardLevel || !awardName || !awardTime) {
        throw new AppError('获奖级别、名称和时间为必填项', 400);
      }

      // 验证获奖级别
      const validLevels = ['school', 'provincial', 'national'];
      if (!validLevels.includes(awardLevel)) {
        throw new AppError('无效的获奖级别', 400);
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      const finalCertificateImage =
        (typeof certificateImage === 'string' && certificateImage.trim().length > 0
          ? certificateImage.trim()
          : null) || (file ? toPublicUploadUrl('awards', file.filename) : null);

      if (!finalCertificateImage) {
        throw new AppError('证书图片为必填项', 400);
      }

      // 如果关联了竞赛，检查竞赛是否存在
      if (competitionId) {
        const competition = await prisma.competition.findUnique({
          where: { id: competitionId },
        });
        if (!competition) {
          throw new AppError('竞赛不存在', 404);
        }
      }

      // 创建获奖记录（校级/省级/国家级需要审核）
      const award = await prisma.award.create({
        data: {
          userId,
          competitionId: competitionId ? Number(competitionId) : null,
          awardLevel,
          awardName,
          awardRank,
          awardTime: new Date(awardTime),
          certificateImage: finalCertificateImage,
          description,
          status: 'pending', // 需要审核
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
        message: '获奖记录提交成功，等待审核',
        data: award,
      });
    } catch (error) {
      next(error);
    }
  }

  // 获取我的获奖记录
  static async getMyAwards(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page = '1', limit = '10', awardLevel, status } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { userId };
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
          orderBy: { awardTime: 'desc' },
          include: {
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

  // 获取获奖详情
  static async getAwardById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const award = await prisma.award.findUnique({
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

      if (!award) {
        throw new AppError('获奖记录不存在', 404);
      }

      // 检查权限
      if (award.userId !== userId && req.user!.role === 'user') {
        throw new AppError('无权访问', 403);
      }

      res.json({
        success: true,
        data: award,
      });
    } catch (error) {
      next(error);
    }
  }

  // 更新获奖记录（用户）
  static async updateAward(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updateData = req.body;

      const award = await prisma.award.findUnique({
        where: { id: parseInt(id) },
      });

      if (!award) {
        throw new AppError('获奖记录不存在', 404);
      }

      if (award.userId !== userId) {
        throw new AppError('无权操作', 403);
      }

      // 只能修改待审核状态的记录
      if (award.status !== 'pending') {
        throw new AppError('只能修改待审核状态的获奖记录', 400);
      }

      // 处理日期字段
      if (updateData.awardTime) {
        updateData.awardTime = new Date(updateData.awardTime);
      }

      const updatedAward = await prisma.award.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      res.json({
        success: true,
        message: '获奖记录更新成功',
        data: updatedAward,
      });
    } catch (error) {
      next(error);
    }
  }

  // 删除获奖记录（用户）
  static async deleteAward(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const award = await prisma.award.findUnique({
        where: { id: parseInt(id) },
      });

      if (!award) {
        throw new AppError('获奖记录不存在', 404);
      }

      if (award.userId !== userId) {
        throw new AppError('无权操作', 403);
      }

      // 只能删除待审核状态的记录
      if (award.status !== 'pending') {
        throw new AppError('只能删除待审核状态的获奖记录', 400);
      }

      await prisma.award.delete({
        where: { id: parseInt(id) },
      });

      res.json({
        success: true,
        message: '获奖记录删除成功',
      });
    } catch (error) {
      next(error);
    }
  }
}
