import { Router } from 'express';
import { emailAssist, followUpAssist } from '../controllers/aiController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect, requirePermission('ai:use'));
router.post('/email', emailAssist);
router.post('/follow-up', followUpAssist);

export default router;
