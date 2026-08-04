import { Router } from 'express';
import {
  listLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  addActivity,
  getPipeline,
  moveLead,
} from '../controllers/leadController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', requirePermission('leads:read'), listLeads);
router.get('/pipeline/board', requirePermission('leads:read'), getPipeline);
router.get('/:id', requirePermission('leads:read'), getLead);
router.post('/', requirePermission('leads:write'), createLead);
router.patch('/:id', requirePermission('leads:write'), updateLead);
router.patch('/:id/move', requirePermission('leads:write'), moveLead);
router.post('/:id/activities', requirePermission('leads:write'), addActivity);
router.delete('/:id', requirePermission('leads:delete'), deleteLead);

export default router;
