import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

// 注册
router.post('/register', AuthController.register);

// 登录
router.post('/login', AuthController.login);

// 获取当前用户信息（需要认证）
router.get('/me', authenticate, AuthController.getCurrentUser);

export { router as authRoutes };
