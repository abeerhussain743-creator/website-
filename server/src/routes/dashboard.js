import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { getDashboard } from '../controllers/dashboardController.js';

const router = Router();
router.use(protect);
router.get('/', requirePermission('calls:read'), getDashboard);
export default router;
