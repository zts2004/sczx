import { Request, Response, NextFunction } from 'express';
import prisma from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';

export class CompetitionController {
  // 获取竞赛列表
  static async getCompetitions(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = '1',
        limit = '10',
        search,
        type,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // 构建查询条件
      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search as string } },
          { description: { contains: search as string } },
        ];
      }

      if (type) {
        where.type = type;
      }

      if (status) {
        where.status = status;
      }

      // 构建排序
      const orderBy: any = {};
      orderBy[sortBy as string] = sortOrder;

      // 查询
      const [competitions, total] = await Promise.all([
        prisma.competition.findMany({
          where,
          skip,
          take: limitNum,
          orderBy,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                realName: true,
              },
            },
          },
        }),
        prisma.competition.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          competitions,
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

  // 获取竞赛详情
  static async getCompetitionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const competition = await prisma.competition.findUnique({
        where: { id: parseInt(id) },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
              realName: true,
            },
          },
          _count: {
            select: {
              registrations: true,
            },
          },
        },
      });

      if (!competition) {
        throw new AppError('竞赛不存在', 404);
      }

      res.json({
        success: true,
        data: competition,
      });
    } catch (error) {
      next(error);
    }
  }

  // 创建竞赛（管理员）
  static async createCompetition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const {
        title,
        description,
        type,
        coverImage,
        startTime,
        endTime,
        registrationStart,
        registrationEnd,
        maxParticipants,
        requirements,
        rules,
        awards,
      } = req.body;

      // 验证必填字段
      if (!title || !startTime || !endTime || !registrationStart || !registrationEnd) {
        throw new AppError('竞赛标题和时间信息为必填项', 400);
      }

      const competition = await prisma.competition.create({
        data: {
          title,
          description,
          type: type || '其他',
          coverImage,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          registrationStart: new Date(registrationStart),
          registrationEnd: new Date(registrationEnd),
          maxParticipants: maxParticipants || 0,
          requirements: requirements ? JSON.parse(JSON.stringify(requirements)) : null,
          rules,
          awards: awards ? JSON.parse(JSON.stringify(awards)) : null,
          status: 'draft',
          createdBy: userId,
        },
      });

      res.status(201).json({
        success: true,
        message: '竞赛创建成功',
        data: competition,
      });
    } catch (error) {
      next(error);
    }
  }

  // 更新竞赛（管理员）
  static async updateCompetition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // 检查竞赛是否存在
      const existingCompetition = await prisma.competition.findUnique({
        where: { id: parseInt(id) },
      });

      if (!existingCompetition) {
        throw new AppError('竞赛不存在', 404);
      }

      // 处理日期字段
      if (updateData.startTime) updateData.startTime = new Date(updateData.startTime);
      if (updateData.endTime) updateData.endTime = new Date(updateData.endTime);
      if (updateData.registrationStart) updateData.registrationStart = new Date(updateData.registrationStart);
      if (updateData.registrationEnd) updateData.registrationEnd = new Date(updateData.registrationEnd);

      // 处理JSON字段
      if (updateData.requirements) updateData.requirements = JSON.parse(JSON.stringify(updateData.requirements));
      if (updateData.awards) updateData.awards = JSON.parse(JSON.stringify(updateData.awards));

      const competition = await prisma.competition.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      res.json({
        success: true,
        message: '竞赛更新成功',
        data: competition,
      });
    } catch (error) {
      next(error);
    }
  }

  // 删除竞赛（管理员）
  static async deleteCompetition(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const competition = await prisma.competition.findUnique({
        where: { id: parseInt(id) },
      });

      if (!competition) {
        throw new AppError('竞赛不存在', 404);
      }

      await prisma.competition.delete({
        where: { id: parseInt(id) },
      });

      res.json({
        success: true,
        message: '竞赛删除成功',
      });
    } catch (error) {
      next(error);
    }
  }
}
