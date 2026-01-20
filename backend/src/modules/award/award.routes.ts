import { Router } from 'express';
import { AwardController } from './award.controller';
import { authenticate } from '../../middleware/auth';
import { createImageUploader } from '../../utils/upload';

const router = Router();
const upload = createImageUploader({ subDir: 'awards' });

// 所有路由都需要认证
router.use(authenticate);

// 上传获奖图片
router.post('/', upload.single('certificate'), AwardController.createAward);

// 获取我的获奖记录
router.get('/my', AwardController.getMyAwards);

// 获取获奖详情
router.get('/:id', AwardController.getAwardById);

// 更新获奖记录
router.put('/:id', AwardController.updateAward);

// 删除获奖记录
router.delete('/:id', AwardController.deleteAward);

export { router as awardRoutes };
