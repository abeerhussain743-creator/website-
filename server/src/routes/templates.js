import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { listTemplates } from '../controllers/templateController.js';

const router = Router();
router.use(protect);
router.get('/', requirePermission('templates:read'), listTemplates);
export default router;
