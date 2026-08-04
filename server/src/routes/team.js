import { Router } from 'express';
import {
  getTeam,
  updateTeam,
  updateMemberRole,
  removeMember,
  regenerateInvite,
} from '../controllers/teamController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', requirePermission('team:read'), getTeam);
router.patch('/', requirePermission('team:write'), updateTeam);
router.patch('/members/:id/role', requirePermission('team:write'), updateMemberRole);
router.delete('/members/:id', requirePermission('team:write'), removeMember);
router.post('/invite/regenerate', requirePermission('team:write'), regenerateInvite);

export default router;
