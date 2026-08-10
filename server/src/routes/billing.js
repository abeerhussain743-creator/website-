import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { getBilling, upgrade } from '../controllers/billingController.js';

const router = Router();
router.use(protect);
router.get('/', requirePermission('billing:read'), getBilling);
router.post('/upgrade', requirePermission('billing:write'), upgrade);
export default router;
