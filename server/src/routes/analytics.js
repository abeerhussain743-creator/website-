import { Router } from 'express';
import { getDashboard } from '../controllers/analyticsController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', protect, requirePermission('analytics:read'), getDashboard);

export default router;
