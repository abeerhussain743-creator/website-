import { Router } from 'express';
import { Account, JournalEntry, JournalLine } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { postJournalEntry } from '../services/accountingService.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const accounts = await Account.find({ companyId: req.companyId }).sort({ accountNumber: 1 });
  res.json({ accounts });
});

router.post('/', async (req, res) => {
  try {
    const account = await Account.create({ ...req.body, companyId: req.companyId });
    res.status(201).json({ account });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      req.body,
      { new: true }
    );
    if (!account) return res.status(404).json({ error: 'Not found' });
    res.json({ account });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/journal', async (req, res) => {
  const entries = await JournalEntry.find({ companyId: req.companyId })
    .sort({ date: -1, createdAt: -1 })
    .limit(100)
    .lean();
  const ids = entries.map((e) => e._id);
  const lines = await JournalLine.find({ journalEntryId: { $in: ids } })
    .populate('accountId', 'accountNumber accountName accountType')
    .lean();
  const byEntry = {};
  for (const l of lines) {
    const key = String(l.journalEntryId);
    if (!byEntry[key]) byEntry[key] = [];
    byEntry[key].push(l);
  }
  res.json({
    entries: entries.map((e) => ({ ...e, lines: byEntry[String(e._id)] || [] })),
  });
});

router.post('/journal', async (req, res) => {
  try {
    const entry = await postJournalEntry({
      companyId: req.companyId,
      createdBy: req.user._id,
      ...req.body,
    });
    const lines = await JournalLine.find({ journalEntryId: entry._id }).populate(
      'accountId',
      'accountNumber accountName'
    );
    res.status(201).json({ entry, lines });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
