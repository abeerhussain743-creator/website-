import { BankTransaction, AuditLog } from '../models/index.js';

/**
 * Parse a simple bank CSV:
 * date,description,amount
 * or Date,Description,Amount
 */
export function parseBankCsv(text) {
  const lines = String(text)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) throw new Error('CSV must include a header and at least one row');

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const dateIdx = header.findIndex((h) => /date|posted/.test(h));
  const descIdx = header.findIndex((h) => /desc|memo|narration|payee/.test(h));
  const amountIdx = header.findIndex((h) => /amount|amt|value/.test(h));
  const debitIdx = header.findIndex((h) => /debit|withdrawal/.test(h));
  const creditIdx = header.findIndex((h) => /credit|deposit/.test(h));

  if (dateIdx < 0 || descIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) {
    throw new Error('CSV must include date, description, and amount (or debit/credit) columns');
  }

  const rows = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const dateRaw = cols[dateIdx];
    const description = cols[descIdx] || '';
    let amount;
    if (amountIdx >= 0) {
      amount = Number(String(cols[amountIdx]).replace(/[$,]/g, ''));
    } else {
      const debit = Number(String(cols[debitIdx] || '0').replace(/[$,]/g, '')) || 0;
      const credit = Number(String(cols[creditIdx] || '0').replace(/[$,]/g, '')) || 0;
      amount = credit - debit;
    }
    if (!dateRaw || Number.isNaN(amount)) continue;
    const date = new Date(dateRaw);
    if (Number.isNaN(date.getTime())) continue;
    rows.push({ date, description, amount });
  }
  if (!rows.length) throw new Error('No valid transactions found in CSV');
  return rows;
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export async function importBankCsv(companyId, bankAccountId, csvText, userId = null) {
  const rows = parseBankCsv(csvText);
  const docs = rows.map((r) => ({
    companyId,
    bankAccountId,
    date: r.date,
    description: r.description,
    amount: r.amount,
    matched: false,
    journalEntryId: null,
  }));
  const inserted = await BankTransaction.insertMany(docs);
  await AuditLog.create({
    companyId,
    userId,
    action: 'bank.csv_imported',
    entityType: 'BankAccount',
    entityId: String(bankAccountId),
    detail: `Imported ${inserted.length} bank transactions from CSV`,
  });
  return { imported: inserted.length, transactions: inserted };
}
