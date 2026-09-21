import { profitAndLoss, postJournalEntry, balanceSheet } from './accountingService.js';
import { AuditLog } from '../models/index.js';

/**
 * Close the books for a fiscal year:
 * Debit each revenue account balance, credit each expense balance,
 * and post the residual net income to Retained Earnings.
 */
export async function closeFiscalYear(companyId, { year, userId = null } = {}) {
  const closeYear = year || new Date().getFullYear();
  const from = new Date(Date.UTC(closeYear, 0, 1));
  const to = new Date(Date.UTC(closeYear, 11, 31, 23, 59, 59, 999));

  const sheet = await balanceSheet(companyId, to);
  if (!sheet.balanced) {
    throw new Error('Cannot close year while the balance sheet is out of balance');
  }

  const pnl = await profitAndLoss(companyId, from, to);
  const lines = [];

  for (const a of pnl.revenue) {
    if (a.balance === 0) continue;
    lines.push({ accountId: a._id, debit: a.balance, memo: `Close ${closeYear} revenue` });
  }
  for (const a of pnl.expense) {
    if (a.balance === 0) continue;
    lines.push({ accountId: a._id, credit: a.balance, memo: `Close ${closeYear} expense` });
  }

  if (pnl.netIncome > 0) {
    lines.push({
      systemKey: 'retained_earnings',
      credit: pnl.netIncome,
      memo: `Net income ${closeYear}`,
    });
  } else if (pnl.netIncome < 0) {
    lines.push({
      systemKey: 'retained_earnings',
      debit: Math.abs(pnl.netIncome),
      memo: `Net loss ${closeYear}`,
    });
  }

  if (lines.length < 2) {
    throw new Error('Nothing to close for this fiscal year');
  }

  const entry = await postJournalEntry({
    companyId,
    date: to,
    reference: `FY-CLOSE-${closeYear}`,
    description: `Fiscal year ${closeYear} closing entry`,
    createdBy: userId,
    sourceType: 'closing',
    lines,
  });

  await AuditLog.create({
    companyId,
    userId,
    action: 'fiscal.closed',
    entityType: 'JournalEntry',
    entityId: String(entry._id),
    detail: `Closed FY ${closeYear} · net income ${pnl.netIncome}`,
  });

  return { entry, pnl, year: closeYear };
}
