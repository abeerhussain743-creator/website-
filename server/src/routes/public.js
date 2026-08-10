import { Router } from 'express';
import { getPublicProposal, trackPublicEvent } from '../controllers/proposalController.js';

const router = Router();
router.get('/proposals/:slug', getPublicProposal);
router.post('/proposals/:slug/events', trackPublicEvent);
export default router;
