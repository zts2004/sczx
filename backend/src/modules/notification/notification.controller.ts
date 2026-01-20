import { Request, Response, NextFunction } from 'express';
import prisma from '../../utils/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AuthRequest } from '../../middleware/auth';

export class NotificationController {
  // 获取通知列表
  static async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { page = '1', limit = '20', isRead } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = { userId };
      if (isRead !== undefined) {
        where.isRead = isRead === 'true';
      }

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
          unreadCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 标记为已读
  static async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await prisma.notification.findUnique({
        where: { id: parseInt(id) },
      });

      if (!notification) {
        throw new AppError('通知不存在', 404);
      }

      if (notification.userId !== userId) {
        throw new AppError('无权操作', 403);
      }

      await prisma.notification.update({
        where: { id: parseInt(id) },
        data: { isRead: true },
      });

      res.json({
        success: true,
        message: '已标记为已读',
      });
    } catch (error) {
      next(error);
    }
  }

  // 全部标记为已读
  static async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      res.json({
        success: true,
        message: '全部标记为已读',
      });
    } catch (error) {
      next(error);
    }
  }
}
