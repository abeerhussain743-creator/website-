import { Router } from 'express';
import multer from 'multer';
import { protect, requirePermission } from '../middleware/auth.js';
import {
  analyzeExistingCall,
  clarifyingQuestions,
  createCall,
  getCall,
  listCalls,
  updateMissingAnswers,
} from '../controllers/callController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();
router.use(protect);

router.get('/', requirePermission('calls:read'), listCalls);
router.get('/:id', requirePermission('calls:read'), getCall);
router.post('/', requirePermission('calls:write'), createCall);
router.post(
  '/upload',
  requirePermission('calls:write'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const text = req.file?.buffer?.toString('utf8') || '';
      req.body = {
        ...req.body,
        transcript: req.body.transcript || text,
        source: req.body.source || (req.file?.mimetype?.startsWith('audio') || req.file?.mimetype?.startsWith('video')
          ? 'recording'
          : 'transcript_file'),
        fileName: req.file?.originalname,
        sourceLabel: req.file?.originalname || req.body.sourceLabel,
      };
      return createCall(req, res, next);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }
);
router.post('/:id/analyze', requirePermission('ai:use'), analyzeExistingCall);
router.patch('/:id/missing', requirePermission('calls:write'), updateMissingAnswers);
router.post('/:id/questions', requirePermission('ai:use'), clarifyingQuestions);

export default router;
