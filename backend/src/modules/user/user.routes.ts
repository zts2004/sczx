import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authenticate);

// 获取个人信息
router.get('/profile', UserController.getProfile);

// 更新个人信息
router.put('/profile', UserController.updateProfile);

// 修改密码
router.put('/password', UserController.changePassword);

export { router as userRoutes };
