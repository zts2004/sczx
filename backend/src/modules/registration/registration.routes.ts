import { Router } from 'express';
import { RegistrationController } from './registration.controller';
import { authenticate } from '../../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const tmpDir = path.resolve(process.cwd(), 'uploads', 'tmp', 'registrations');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const userId = (req as any).user?.id || 'unknown';
      const userDir = path.join(tmpDir, String(userId));
      if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
      cb(null, userDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const safeExt = ext && ext.length <= 10 ? ext : '';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 50 * 1024 * 1024) }, // 默认 50MB 单文件
});

// 所有路由都需要认证
router.use(authenticate);

// 提交报名
router.post('/', RegistrationController.createRegistration);

// 获取我的报名记录
router.get('/my', RegistrationController.getMyRegistrations);

// 获取报名详情
router.get('/:id', RegistrationController.getRegistrationById);

// 取消报名
router.delete('/:id', RegistrationController.cancelRegistration);

// 上传参赛材料（报名后）
router.post('/:id/materials', upload.array('files', 20), RegistrationController.uploadMaterials);

export { router as registrationRoutes };
