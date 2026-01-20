import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取通知列表
router.get('/', NotificationController.getNotifications);

// 标记为已读
router.put('/:id/read', NotificationController.markAsRead);

// 全部标记为已读
router.put('/read-all', NotificationController.markAllAsRead);

export { router as notificationRoutes };
