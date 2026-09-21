import mongoose from 'mongoose';
import { Account, JournalEntry, JournalLine, AuditLog } from '../models/index.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export async function getAccountMap(companyId) {
  const accounts = await Account.find({ companyId, isActive: true });
  const byKey = {};
  const byId = {};
  for (const a of accounts) {
    byId[String(a._id)] = a;
    if (a.systemKey) byKey[a.systemKey] = a;
  }
  return { accounts, byKey, byId };
}

/**
 * Create a balanced journal entry with lines.
 * lines: [{ accountId | systemKey, debit?, credit?, memo? }]
 */
export async function postJournalEntry({
  companyId,
  date,
  reference = '',
  description = '',
  createdBy = null,
  sourceType = 'manual',
  sourceId = null,
  lines,
  session = null,
}) {
  if (!lines?.length || lines.length < 2) {
    throw new Error('Journal entry requires at least two lines');
  }

  const { byKey } = await getAccountMap(companyId);
  const resolved = [];

  for (const line of lines) {
    let accountId = line.accountId;
    if (!accountId && line.systemKey) {
      const acct = byKey[line.systemKey];
      if (!acct) throw new Error(`Missing system account: ${line.systemKey}`);
      accountId = acct._id;
    }
    if (!accountId) throw new Error('Journal line missing account');

    const debit = round2(line.debit || 0);
    const credit = round2(line.credit || 0);
    if ((debit > 0 && credit > 0) || (debit === 0 && credit === 0)) {
      throw new Error('Each line must have either debit or credit');
    }
    resolved.push({ accountId, debit, credit, memo: line.memo || '' });
  }

  const totalDebit = round2(resolved.reduce((s, l) => s + l.debit, 0));
  const totalCredit = round2(resolved.reduce((s, l) => s + l.credit, 0));
  if (totalDebit !== totalCredit) {
    throw new Error(`Unbalanced entry: debit ${totalDebit} ≠ credit ${totalCredit}`);
  }

  const opts = session ? { session } : {};
  const [entry] = await JournalEntry.create(
    [
      {
        companyId,
        date: date || new Date(),
        reference,
        description,
        status: 'posted',
        createdBy,
        sourceType,
        sourceId,
      },
    ],
    opts
  );

  await JournalLine.insertMany(
    resolved.map((l) => ({ ...l, journalEntryId: entry._id })),
    opts
  );

  await AuditLog.create(
    [
      {
        companyId,
        userId: createdBy,
        action: 'journal.posted',
        entityType: 'JournalEntry',
        entityId: String(entry._id),
        detail: `${reference || 'JE'} · ${description} · Dr ${totalDebit} / Cr ${totalCredit}`,
      },
    ],
    opts
  );

  return entry;
}

export async function getAccountBalances(companyId, { asOf = null, from = null, to = null } = {}) {
  const matchEntry = {
    companyId: new mongoose.Types.ObjectId(companyId),
    status: 'posted',
  };
  if (asOf) matchEntry.date = { $lte: new Date(asOf) };
  if (from || to) {
    matchEntry.date = {};
    if (from) matchEntry.date.$gte = new Date(from);
    if (to) matchEntry.date.$lte = new Date(to);
  }

  const rows = await JournalEntry.aggregate([
    { $match: matchEntry },
    {
      $lookup: {
        from: 'journallines',
        localField: '_id',
        foreignField: 'journalEntryId',
        as: 'lines',
      },
    },
    { $unwind: '$lines' },
    {
      $group: {
        _id: '$lines.accountId',
        debit: { $sum: '$lines.debit' },
        credit: { $sum: '$lines.credit' },
      },
    },
  ]);

  const accounts = await Account.find({ companyId }).lean();
  const balanceMap = Object.fromEntries(rows.map((r) => [String(r._id), r]));

  return accounts.map((a) => {
    const b = balanceMap[String(a._id)] || { debit: 0, credit: 0 };
    const debit = round2(b.debit);
    const credit = round2(b.credit);
    // Normal balances: Asset/Expense = debit, Liability/Equity/Revenue = credit
    const isDebitNormal = a.accountType === 'Asset' || a.accountType === 'Expense';
    const balance = isDebitNormal ? round2(debit - credit) : round2(credit - debit);
    return {
      ...a,
      debit,
      credit,
      balance,
    };
  });
}

export async function trialBalance(companyId, asOf = null) {
  const balances = await getAccountBalances(companyId, { asOf });
  const active = balances.filter((a) => a.debit !== 0 || a.credit !== 0 || a.isActive);
  const totalDebit = round2(active.reduce((s, a) => s + a.debit, 0));
  const totalCredit = round2(active.reduce((s, a) => s + a.credit, 0));
  return { asOf: asOf || new Date(), accounts: active, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}

export async function profitAndLoss(companyId, from, to) {
  const balances = await getAccountBalances(companyId, { from, to });
  const revenue = balances.filter((a) => a.accountType === 'Revenue');
  const expense = balances.filter((a) => a.accountType === 'Expense');
  const totalRevenue = round2(revenue.reduce((s, a) => s + a.balance, 0));
  const totalExpense = round2(expense.reduce((s, a) => s + a.balance, 0));
  return {
    from,
    to,
    revenue,
    expense,
    totalRevenue,
    totalExpense,
    netIncome: round2(totalRevenue - totalExpense),
  };
}

export async function balanceSheet(companyId, asOf = null) {
  const balances = await getAccountBalances(companyId, { asOf });
  const assets = balances.filter((a) => a.accountType === 'Asset');
  const liabilities = balances.filter((a) => a.accountType === 'Liability');
  const equity = balances.filter((a) => a.accountType === 'Equity');

  // Include YTD net income in equity for a proper balance sheet
  const yearStart = new Date(asOf || new Date());
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const pnl = await profitAndLoss(companyId, yearStart, asOf || new Date());

  const totalAssets = round2(assets.reduce((s, a) => s + a.balance, 0));
  const totalLiabilities = round2(liabilities.reduce((s, a) => s + a.balance, 0));
  const totalEquityBook = round2(equity.reduce((s, a) => s + a.balance, 0));
  const totalEquity = round2(totalEquityBook + pnl.netIncome);

  return {
    asOf: asOf || new Date(),
    assets,
    liabilities,
    equity,
    netIncome: pnl.netIncome,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: totalAssets === round2(totalLiabilities + totalEquity),
  };
}

export async function cashFlow(companyId, from, to) {
  // Simplified indirect-style cash movement from cash/bank/clearing accounts
  const balances = await getAccountBalances(companyId, { from, to });
  const cashKeys = new Set(['cash', 'bank', 'shopify_clearing', 'shopify_balance']);
  const cashAccounts = balances.filter(
    (a) => a.accountType === 'Asset' && (cashKeys.has(a.systemKey) || /cash|bank|clearing|shopify/i.test(a.accountName))
  );
  const operatingIn = round2(
    balances.filter((a) => a.accountType === 'Revenue').reduce((s, a) => s + a.balance, 0)
  );
  const operatingOut = round2(
    balances.filter((a) => a.accountType === 'Expense').reduce((s, a) => s + a.balance, 0)
  );
  const netCash = round2(cashAccounts.reduce((s, a) => s + (a.debit - a.credit), 0));

  return {
    from,
    to,
    operating: { inflows: operatingIn, outflows: operatingOut, net: round2(operatingIn - operatingOut) },
    cashAccounts,
    netCashChange: netCash,
  };
}

export async function generalLedger(companyId, { accountId = null, from = null, to = null } = {}) {
  const matchEntry = {
    companyId: new mongoose.Types.ObjectId(companyId),
    status: 'posted',
  };
  if (from || to) {
    matchEntry.date = {};
    if (from) matchEntry.date.$gte = new Date(from);
    if (to) matchEntry.date.$lte = new Date(to);
  }

  const pipeline = [
    { $match: matchEntry },
    { $sort: { date: 1, createdAt: 1 } },
    {
      $lookup: {
        from: 'journallines',
        localField: '_id',
        foreignField: 'journalEntryId',
        as: 'lines',
      },
    },
    { $unwind: '$lines' },
  ];

  if (accountId) {
    pipeline.push({
      $match: { 'lines.accountId': new mongoose.Types.ObjectId(accountId) },
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: 'accounts',
        localField: 'lines.accountId',
        foreignField: '_id',
        as: 'account',
      },
    },
    { $unwind: '$account' },
    {
      $project: {
        date: 1,
        reference: 1,
        description: 1,
        status: 1,
        sourceType: 1,
        accountId: '$lines.accountId',
        accountNumber: '$account.accountNumber',
        accountName: '$account.accountName',
        accountType: '$account.accountType',
        debit: '$lines.debit',
        credit: '$lines.credit',
        memo: '$lines.memo',
      },
    }
  );

  return JournalEntry.aggregate(pipeline);
}
