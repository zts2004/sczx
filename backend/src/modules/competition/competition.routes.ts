import { Router } from 'express';
import { CompetitionController } from './competition.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

// 公开路由
router.get('/', CompetitionController.getCompetitions);
router.get('/:id', CompetitionController.getCompetitionById);

// 管理员路由
router.post('/', authenticate, authorize('admin', 'super_admin'), CompetitionController.createCompetition);
router.put('/:id', authenticate, authorize('admin', 'super_admin'), CompetitionController.updateCompetition);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), CompetitionController.deleteCompetition);

export { router as competitionRoutes };

