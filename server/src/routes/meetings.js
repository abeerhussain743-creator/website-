import { Router } from 'express';
import {
  listMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  remindMeeting,
} from '../controllers/meetingController.js';
import { protect, requirePermission } from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/', requirePermission('meetings:read'), listMeetings);
router.post('/', requirePermission('meetings:write'), createMeeting);
router.patch('/:id', requirePermission('meetings:write'), updateMeeting);
router.delete('/:id', requirePermission('meetings:write'), deleteMeeting);
router.post('/:id/remind', requirePermission('meetings:write'), remindMeeting);

export default router;
