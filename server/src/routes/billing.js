import { Router } from 'express';
import { getPlans, checkout, portal, downgradeFree } from '../controllers/billingController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/plans', requirePermission('billing:read'), getPlans);
router.post('/checkout', requirePermission('billing:write'), checkout);
router.post('/portal', requirePermission('billing:write'), portal);
router.post('/downgrade', requirePermission('billing:write'), downgradeFree);

export default router;
