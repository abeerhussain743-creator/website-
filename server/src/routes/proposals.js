import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import {
  downloadPdf,
  followUp,
  generateFromCall,
  getProposal,
  listProposals,
  sendProposal,
  trackingTimeline,
  updateProposal,
} from '../controllers/proposalController.js';

const router = Router();
router.use(protect);
router.get('/', requirePermission('proposals:read'), listProposals);
router.get('/:id', requirePermission('proposals:read'), getProposal);
router.get('/:id/tracking', requirePermission('proposals:read'), trackingTimeline);
router.get('/:id/pdf', requirePermission('proposals:read'), downloadPdf);
router.post('/from-call/:callId', requirePermission('ai:use'), generateFromCall);
router.patch('/:id', requirePermission('proposals:write'), updateProposal);
router.post('/:id/send', requirePermission('proposals:send'), sendProposal);
router.post('/:id/follow-up', requirePermission('ai:use'), followUp);

export default router;
