import { Router } from 'express';
import { protect, requirePermission } from '../middleware/auth.js';
import { createClient, listClients, updateClient } from '../controllers/clientController.js';

const router = Router();
router.use(protect);
router.get('/', requirePermission('clients:read'), listClients);
router.post('/', requirePermission('clients:write'), createClient);
router.patch('/:id', requirePermission('clients:write'), updateClient);
export default router;
