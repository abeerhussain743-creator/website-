import { Router } from 'express';
import {
  Customer,
  Vendor,
  Product,
  Order,
  Payment,
  Refund,
  Payout,
  Expense,
  Inventory,
  InventoryTransaction,
  BankAccount,
  BankTransaction,
  Tax,
  Attachment,
  AuditLog,
} from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import {
  processShopifyOrder,
  processRefund,
  processPayout,
  processExpense,
  adjustInventory,
} from '../services/shopifyAutomation.js';

const router = Router();
router.use(requireAuth);

// Customers
router.get('/customers', async (req, res) => {
  res.json({ customers: await Customer.find({ companyId: req.companyId }).sort({ name: 1 }) });
});
router.post('/customers', async (req, res) => {
  const customer = await Customer.create({ ...req.body, companyId: req.companyId });
  res.status(201).json({ customer });
});

// Vendors
router.get('/vendors', async (req, res) => {
  res.json({ vendors: await Vendor.find({ companyId: req.companyId }).sort({ name: 1 }) });
});
router.post('/vendors', async (req, res) => {
  const vendor = await Vendor.create({ ...req.body, companyId: req.companyId });
  res.status(201).json({ vendor });
});

// Products & inventory
router.get('/products', async (req, res) => {
  const products = await Product.find({ companyId: req.companyId }).sort({ title: 1 });
  const inventory = await Inventory.find({ companyId: req.companyId });
  const byProduct = Object.fromEntries(inventory.map((i) => [String(i.productId), i]));
  res.json({
    products: products.map((p) => ({
      ...p.toObject(),
      inventory: byProduct[String(p._id)] || null,
    })),
  });
});

router.get('/inventory', async (req, res) => {
  const [inventory, transactions] = await Promise.all([
    Inventory.find({ companyId: req.companyId }).populate('productId'),
    InventoryTransaction.find({ companyId: req.companyId }).sort({ date: -1 }).limit(50).populate('productId', 'sku title'),
  ]);
  res.json({ inventory, transactions });
});

router.post('/inventory/adjust', async (req, res) => {
  try {
    const result = await adjustInventory(req.companyId, req.body, req.user._id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Orders / Shopify sync
router.get('/orders', async (req, res) => {
  const orders = await Order.find({ companyId: req.companyId })
    .sort({ createdAt: -1 })
    .populate('customerId', 'name email');
  res.json({ orders });
});

router.post('/orders/sync', async (req, res) => {
  try {
    const order = await processShopifyOrder(req.companyId, req.body, req.user._id);
    res.status(201).json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/payments', async (req, res) => {
  res.json({
    payments: await Payment.find({ companyId: req.companyId }).sort({ paymentDate: -1 }).populate('orderId', 'orderNumber total'),
  });
});

router.post('/refunds', async (req, res) => {
  try {
    const refund = await processRefund(req.companyId, req.body, req.user._id);
    res.status(201).json({ refund });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/refunds', async (req, res) => {
  res.json({ refunds: await Refund.find({ companyId: req.companyId }).sort({ date: -1 }) });
});

// Payouts
router.get('/payouts', async (req, res) => {
  res.json({
    payouts: await Payout.find({ companyId: req.companyId })
      .sort({ depositDate: -1 })
      .populate('bankAccount', 'bankName accountNumber'),
  });
});

router.post('/payouts', async (req, res) => {
  try {
    const payout = await processPayout(req.companyId, req.body, req.user._id);
    res.status(201).json({ payout });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Expenses
router.get('/expenses', async (req, res) => {
  res.json({
    expenses: await Expense.find({ companyId: req.companyId })
      .sort({ date: -1 })
      .populate('vendorId', 'name')
      .populate('accountId', 'accountName accountNumber'),
  });
});

router.post('/expenses', async (req, res) => {
  try {
    const expense = await processExpense(req.companyId, req.body, req.user._id);
    res.status(201).json({ expense });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bank
router.get('/bank-accounts', async (req, res) => {
  res.json({ accounts: await BankAccount.find({ companyId: req.companyId }) });
});

router.get('/bank-transactions', async (req, res) => {
  const filter = { companyId: req.companyId };
  if (req.query.bankAccountId) filter.bankAccountId = req.query.bankAccountId;
  if (req.query.matched != null) filter.matched = req.query.matched === 'true';
  res.json({
    transactions: await BankTransaction.find(filter)
      .sort({ date: -1 })
      .populate('bankAccountId', 'bankName accountNumber')
      .populate('journalEntryId', 'reference description'),
  });
});

router.patch('/bank-transactions/:id/match', async (req, res) => {
  const tx = await BankTransaction.findOneAndUpdate(
    { _id: req.params.id, companyId: req.companyId },
    { matched: true, journalEntryId: req.body.journalEntryId || null },
    { new: true }
  );
  if (!tx) return res.status(404).json({ error: 'Not found' });
  res.json({ transaction: tx });
});

// Tax / attachments / audit
router.get('/taxes', async (req, res) => {
  res.json({ taxes: await Tax.find({ companyId: req.companyId }).populate('accountId', 'accountName') });
});

router.get('/attachments', async (req, res) => {
  res.json({ attachments: await Attachment.find({ companyId: req.companyId }).sort({ createdAt: -1 }) });
});

router.get('/audit', async (req, res) => {
  res.json({ logs: await AuditLog.find({ companyId: req.companyId }).sort({ createdAt: -1 }).limit(100) });
});

router.post('/sync/demo', async (req, res) => {
  try {
    const products = await Product.find({ companyId: req.companyId });
    const product = products[0];
    const n = await Order.countDocuments({ companyId: req.companyId });
    const orderNumber = `#${1050 + n}`;
    const order = await processShopifyOrder(
      req.companyId,
      {
        shopifyOrderId: `gid://shopify/Order/demo_${Date.now()}`,
        orderNumber,
        subtotal: 150,
        tax: 12,
        shipping: 10,
        total: 172,
        costOfGoods: 70,
        shopifyFee: 5,
        createdAt: new Date(),
        lineItems: product
          ? [{ productId: product._id, title: product.title, quantity: 1, unitPrice: 150, unitCost: 70 }]
          : [],
      },
      req.user._id
    );
    res.status(201).json({ order, message: `Synced demo order ${orderNumber}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
