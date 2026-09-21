import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import crypto from 'node:crypto';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed/seed.js';
import { User, Company } from '../models/index.js';
import { trialBalance, profitAndLoss, balanceSheet } from '../services/accountingService.js';
import { parseBankCsv } from '../services/bankImportService.js';
import { verifyWebhookHmac } from '../services/shopifyService.js';

describe('Meridian production core', () => {
  let companyId;

  before(async () => {
    process.env.SEED_ON_START = 'false';
    await connectDB();
    await seedDatabase();
    const user = await User.findOne({ email: /demo/i });
    assert.ok(user, 'demo user should exist');
    companyId = user.companyId;
  });

  after(async () => {
    await disconnectDB();
  });

  it('seeds a demo company and user', async () => {
    const company = await Company.findById(companyId);
    assert.ok(company);
    assert.ok(company.companyName);
  });

  it('keeps the trial balance in balance', async () => {
    const tb = await trialBalance(companyId);
    assert.equal(tb.balanced, true);
    assert.equal(tb.totalDebit, tb.totalCredit);
    assert.ok(tb.accounts.length > 0);
  });

  it('produces a balanced balance sheet and P&L', async () => {
    const sheet = await balanceSheet(companyId);
    assert.equal(sheet.balanced, true);
    const pnl = await profitAndLoss(
      companyId,
      new Date(new Date().getFullYear(), 0, 1),
      new Date()
    );
    assert.equal(typeof pnl.netIncome, 'number');
  });

  it('parses bank CSV rows', () => {
    const csv = 'Date,Description,Amount\n2026-07-18,Shopify payout,167.00\n2026-07-10,Ads,-450.00\n';
    const rows = parseBankCsv(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].amount, 167);
    assert.equal(rows[1].amount, -450);
  });

  it('verifies Shopify webhook HMAC', () => {
    process.env.SHOPIFY_API_SECRET = 'test-secret';
    const body = Buffer.from('{"id":1}');
    const digest = crypto.createHmac('sha256', 'test-secret').update(body).digest('base64');
    assert.equal(verifyWebhookHmac(body, digest), true);
    assert.equal(verifyWebhookHmac(body, 'bad'), false);
  });
});
