import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { createFileUploader } from '../../utils/upload';

const router = Router();
const certificateUpload = createFileUploader({
  subDir: 'certificates',
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
});

// 所有路由都需要管理员权限
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// 报名管理
router.get('/registrations/competition/:competitionId', AdminController.getCompetitionRegistrations);
router.put('/registrations/:id/review', AdminController.reviewRegistration);
router.get('/export/competition/:competitionId/materials.zip', AdminController.exportCompetitionMaterialsZip);

// 获奖管理
router.post('/awards/certificate', certificateUpload.single('certificate'), AdminController.issueCollegeCertificate);
router.get('/awards', AdminController.getAllAwards);
router.put('/awards/:id/review', AdminController.reviewAward);

// 数据导出（Excel）
router.get('/export/awards.xlsx', AdminController.exportAwardsExcel);
router.get('/export/registrations.xlsx', AdminController.exportRegistrationsExcel);

// 统计数据
router.get('/statistics', AdminController.getStatistics);

// 用户管理（指定用户为管理员）
router.get('/users', AdminController.getUsers);
router.put('/users/:id/role', AdminController.updateUserRole);

export { router as adminRoutes };
