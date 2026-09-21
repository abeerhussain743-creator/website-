import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { Company } from '../models/index.js';
import {
  buildTrialBalanceExcel,
  buildProfitLossExcel,
  buildBalanceSheetExcel,
  buildReportPdf,
} from '../services/exportService.js';

const router = Router();
router.use(requireAuth);

router.get('/excel/:type', requireMinRole('viewer'), async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    const { type } = req.params;
    const asOf = req.query.asOf || null;
    const from = req.query.from || new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to || new Date();

    let buffer;
    let filename;
    if (type === 'trial-balance') {
      buffer = await buildTrialBalanceExcel(req.companyId, company.companyName, asOf);
      filename = 'trial-balance.xlsx';
    } else if (type === 'profit-loss') {
      buffer = await buildProfitLossExcel(req.companyId, company.companyName, from, to);
      filename = 'profit-loss.xlsx';
    } else if (type === 'balance-sheet') {
      buffer = await buildBalanceSheetExcel(req.companyId, company.companyName, asOf);
      filename = 'balance-sheet.xlsx';
    } else {
      return res.status(400).json({ error: 'Unknown export type' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/pdf/:type', requireMinRole('viewer'), async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    const { type } = req.params;
    const asOf = req.query.asOf || null;
    const from = req.query.from || new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to || new Date();
    const buffer = await buildReportPdf(req.companyId, company.companyName, type, { from, to, asOf });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
