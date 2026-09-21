import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import {
  trialBalance,
  profitAndLoss,
  balanceSheet,
  generalLedger,
} from './accountingService.js';

function money(n) {
  return Number(n || 0);
}

export async function buildTrialBalanceExcel(companyId, companyName, asOf = null) {
  const data = await trialBalance(companyId, asOf);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Meridian Books';
  const ws = wb.addWorksheet('Trial Balance');
  ws.addRow([companyName || 'Company', 'Trial Balance']);
  ws.addRow(['As of', data.asOf]);
  ws.addRow([]);
  ws.addRow(['Account #', 'Account', 'Type', 'Debit', 'Credit']);
  for (const a of data.accounts) {
    ws.addRow([a.accountNumber, a.accountName, a.accountType, money(a.debit), money(a.credit)]);
  }
  ws.addRow([]);
  ws.addRow(['', 'Totals', '', money(data.totalDebit), money(data.totalCredit)]);
  ws.getColumn(4).numFmt = '#,##0.00';
  ws.getColumn(5).numFmt = '#,##0.00';
  return wb.xlsx.writeBuffer();
}

export async function buildProfitLossExcel(companyId, companyName, from, to) {
  const data = await profitAndLoss(companyId, from, to);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Profit and Loss');
  ws.addRow([companyName || 'Company', 'Profit & Loss']);
  ws.addRow(['From', from, 'To', to]);
  ws.addRow([]);
  ws.addRow(['Revenue']);
  ws.addRow(['Account #', 'Account', 'Amount']);
  for (const a of data.revenue) ws.addRow([a.accountNumber, a.accountName, money(a.balance)]);
  ws.addRow(['', 'Total Revenue', money(data.totalRevenue)]);
  ws.addRow([]);
  ws.addRow(['Expenses']);
  ws.addRow(['Account #', 'Account', 'Amount']);
  for (const a of data.expense) ws.addRow([a.accountNumber, a.accountName, money(a.balance)]);
  ws.addRow(['', 'Total Expenses', money(data.totalExpense)]);
  ws.addRow([]);
  ws.addRow(['', 'Net Income', money(data.netIncome)]);
  return wb.xlsx.writeBuffer();
}

export async function buildBalanceSheetExcel(companyId, companyName, asOf = null) {
  const data = await balanceSheet(companyId, asOf);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Balance Sheet');
  ws.addRow([companyName || 'Company', 'Balance Sheet']);
  ws.addRow(['As of', data.asOf]);
  ws.addRow([]);
  const section = (title, rows, total) => {
    ws.addRow([title]);
    ws.addRow(['Account #', 'Account', 'Balance']);
    for (const a of rows) ws.addRow([a.accountNumber, a.accountName, money(a.balance)]);
    ws.addRow(['', `Total ${title}`, money(total)]);
    ws.addRow([]);
  };
  section('Assets', data.assets, data.totalAssets);
  section('Liabilities', data.liabilities, data.totalLiabilities);
  section('Equity', data.equity, data.totalEquityBook ?? data.totalEquity - (data.netIncome || 0));
  ws.addRow(['', 'Net Income YTD', money(data.netIncome)]);
  ws.addRow(['', 'Total Equity', money(data.totalEquity)]);
  return wb.xlsx.writeBuffer();
}

function pdfTable(doc, headers, rows) {
  const startX = doc.x;
  let y = doc.y;
  const colW = headers.map(() => 100);
  doc.fontSize(9).fillColor('#334155');
  headers.forEach((h, i) => doc.text(h, startX + i * 110, y, { width: 105, continued: false }));
  y += 16;
  doc.moveTo(startX, y).lineTo(startX + headers.length * 110, y).stroke('#cbd5e1');
  y += 6;
  doc.fillColor('#0f172a');
  for (const row of rows) {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    row.forEach((cell, i) => {
      doc.text(String(cell ?? ''), startX + i * 110, y, { width: 105 });
    });
    y += 14;
  }
  doc.y = y + 8;
  doc.x = startX;
}

export async function buildReportPdf(companyId, companyName, type, { from, to, asOf } = {}) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));

  const done = new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.fillColor('#0f172a').fontSize(18).text('Meridian Books', { continued: false });
  doc.fontSize(11).fillColor('#64748b').text(companyName || 'Company');
  doc.moveDown();
  doc.fillColor('#0f172a').fontSize(14);

  if (type === 'trial-balance') {
    const data = await trialBalance(companyId, asOf);
    doc.text('Trial Balance');
    doc.fontSize(10).fillColor('#64748b').text(`As of ${new Date(data.asOf).toLocaleDateString()}`);
    doc.moveDown();
    pdfTable(
      doc,
      ['Account #', 'Account', 'Debit', 'Credit'],
      data.accounts.map((a) => [a.accountNumber, a.accountName, money(a.debit).toFixed(2), money(a.credit).toFixed(2)])
    );
    doc.fontSize(10).fillColor('#0f172a').text(`Totals  Dr ${data.totalDebit.toFixed(2)}  Cr ${data.totalCredit.toFixed(2)}`);
    doc.text(data.balanced ? 'Status: Balanced' : 'Status: OUT OF BALANCE');
  } else if (type === 'profit-loss') {
    const data = await profitAndLoss(companyId, from, to);
    doc.text('Profit & Loss');
    doc.fontSize(10).fillColor('#64748b').text(`${new Date(from).toLocaleDateString()} – ${new Date(to).toLocaleDateString()}`);
    doc.moveDown();
    pdfTable(
      doc,
      ['Account', 'Amount'],
      [
        ...data.revenue.map((a) => [a.accountName, money(a.balance).toFixed(2)]),
        ['Total Revenue', money(data.totalRevenue).toFixed(2)],
        ...data.expense.map((a) => [a.accountName, money(a.balance).toFixed(2)]),
        ['Total Expenses', money(data.totalExpense).toFixed(2)],
        ['Net Income', money(data.netIncome).toFixed(2)],
      ]
    );
  } else if (type === 'balance-sheet') {
    const data = await balanceSheet(companyId, asOf);
    doc.text('Balance Sheet');
    doc.fontSize(10).fillColor('#64748b').text(`As of ${new Date(data.asOf).toLocaleDateString()}`);
    doc.moveDown();
    pdfTable(
      doc,
      ['Account', 'Balance'],
      [
        ...data.assets.map((a) => [a.accountName, money(a.balance).toFixed(2)]),
        ['Total Assets', money(data.totalAssets).toFixed(2)],
        ...data.liabilities.map((a) => [a.accountName, money(a.balance).toFixed(2)]),
        ['Total Liabilities', money(data.totalLiabilities).toFixed(2)],
        ...data.equity.map((a) => [a.accountName, money(a.balance).toFixed(2)]),
        ['Net Income YTD', money(data.netIncome).toFixed(2)],
        ['Total Equity', money(data.totalEquity).toFixed(2)],
      ]
    );
  } else if (type === 'general-ledger') {
    const rows = await generalLedger(companyId, { from, to });
    doc.text('General Ledger');
    doc.moveDown();
    pdfTable(
      doc,
      ['Date', 'Ref', 'Account', 'Debit', 'Credit'],
      rows.slice(0, 200).map((r) => [
        new Date(r.date).toLocaleDateString(),
        r.reference || '',
        r.accountName,
        money(r.debit).toFixed(2),
        money(r.credit).toFixed(2),
      ])
    );
  } else {
    throw new Error('Unknown report type');
  }

  doc.end();
  return done;
}
