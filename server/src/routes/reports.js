import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  trialBalance,
  profitAndLoss,
  balanceSheet,
  cashFlow,
  generalLedger,
  getAccountBalances,
} from '../services/accountingService.js';
import { Order, Expense, Payout, Inventory, Product, Customer, Vendor, AuditLog } from '../models/index.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const companyId = req.companyId;
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const [pnl, sheet, orders, expenses, payouts, inventory, customers, vendors, recentAudit] =
      await Promise.all([
        profitAndLoss(companyId, yearStart, now),
        balanceSheet(companyId, now),
        Order.find({ companyId }).sort({ createdAt: -1 }).limit(8).populate('customerId', 'name email'),
        Expense.find({ companyId }).sort({ date: -1 }).limit(5).populate('vendorId', 'name'),
        Payout.find({ companyId }).sort({ depositDate: -1 }).limit(5),
        Inventory.find({ companyId }).populate('productId', 'sku title'),
        Customer.countDocuments({ companyId }),
        Vendor.countDocuments({ companyId }),
        AuditLog.find({ companyId }).sort({ createdAt: -1 }).limit(10),
      ]);

    const salesTotal = orders.reduce((s, o) => s + o.total, 0);
    const inventoryValue = inventory.reduce(
      (s, i) => s + i.quantity * i.averageCost,
      0
    );

    res.json({
      pnl,
      sheet,
      kpis: {
        revenueYtd: pnl.totalRevenue,
        netIncomeYtd: pnl.netIncome,
        totalAssets: sheet.totalAssets,
        cashAndBank: sheet.assets
          .filter((a) => ['cash', 'bank', 'shopify_clearing'].includes(a.systemKey))
          .reduce((s, a) => s + a.balance, 0),
        openOrders: await Order.countDocuments({ companyId }),
        customers,
        vendors,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
        recentSalesTotal: Math.round(salesTotal * 100) / 100,
      },
      recentOrders: orders,
      recentExpenses: expenses,
      recentPayouts: payouts,
      inventory,
      audit: recentAudit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trial-balance', async (req, res) => {
  try {
    res.json(await trialBalance(req.companyId, req.query.asOf || null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profit-loss', async (req, res) => {
  try {
    const from = req.query.from || new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to || new Date();
    res.json(await profitAndLoss(req.companyId, from, to));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/balance-sheet', async (req, res) => {
  try {
    res.json(await balanceSheet(req.companyId, req.query.asOf || null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/cash-flow', async (req, res) => {
  try {
    const from = req.query.from || new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to || new Date();
    res.json(await cashFlow(req.companyId, from, to));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/general-ledger', async (req, res) => {
  try {
    const rows = await generalLedger(req.companyId, {
      accountId: req.query.accountId || null,
      from: req.query.from || null,
      to: req.query.to || null,
    });
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/account-balances', async (req, res) => {
  try {
    res.json({ accounts: await getAccountBalances(req.companyId, { asOf: req.query.asOf || null }) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tax', async (req, res) => {
  try {
    const balances = await getAccountBalances(req.companyId);
    const tax = balances.find((a) => a.systemKey === 'sales_tax_payable');
    const orders = await Order.find({ companyId: req.companyId });
    const collected = orders.reduce((s, o) => s + (o.tax || 0), 0);
    res.json({
      liability: tax?.balance || 0,
      collected: Math.round(collected * 100) / 100,
      ordersWithTax: orders.filter((o) => o.tax > 0).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
