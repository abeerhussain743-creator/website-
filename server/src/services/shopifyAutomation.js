import {
  Order,
  Payment,
  Refund,
  Payout,
  Expense,
  Inventory,
  InventoryTransaction,
  BankTransaction,
  Product,
  AuditLog,
} from '../models/index.js';
import { postJournalEntry } from './accountingService.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Shopify Order → Invoice → Journal Entry → Inventory → Fees
 *
 * Example: $150 product + $10 shipping + $12 tax, $5 fee, $70 COGS
 * Dr Shopify Clearing 172
 * Cr Sales Revenue 150
 * Cr Shipping Revenue 10
 * Cr Sales Tax Payable 12
 * Dr COGS 70 / Cr Inventory 70
 * Dr Merchant Fees 5 / Cr Shopify Clearing 5
 */
export async function processShopifyOrder(companyId, orderPayload, userId = null) {
  const {
    shopifyOrderId,
    customerId,
    orderNumber,
    subtotal,
    discount = 0,
    tax = 0,
    shipping = 0,
    total,
    costOfGoods = 0,
    shopifyFee = 0,
    financialStatus = 'paid',
    fulfillmentStatus = 'fulfilled',
    lineItems = [],
    paymentDate,
    gateway = 'shopify_payments',
    transactionId = '',
    createdAt,
  } = orderPayload;

  const orderTotal = round2(total ?? subtotal - discount + tax + shipping);
  const clearingAmount = round2(orderTotal);

  const order = await Order.create({
    companyId,
    shopifyOrderId,
    customerId,
    orderNumber,
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    shipping: round2(shipping),
    total: orderTotal,
    costOfGoods: round2(costOfGoods),
    shopifyFee: round2(shopifyFee),
    financialStatus,
    fulfillmentStatus,
    lineItems,
    createdAt: createdAt || new Date(),
  });

  const saleLines = [
    { systemKey: 'shopify_clearing', debit: clearingAmount, memo: `Order ${orderNumber}` },
    { systemKey: 'product_sales', credit: round2(subtotal - discount), memo: 'Product sales' },
  ];
  if (shipping > 0) {
    saleLines.push({ systemKey: 'shipping_income', credit: round2(shipping), memo: 'Shipping' });
  }
  if (tax > 0) {
    saleLines.push({ systemKey: 'sales_tax_payable', credit: round2(tax), memo: 'Sales tax' });
  }

  const saleEntry = await postJournalEntry({
    companyId,
    date: createdAt || new Date(),
    reference: orderNumber,
    description: `Shopify order ${orderNumber}`,
    createdBy: userId,
    sourceType: 'order',
    sourceId: order._id,
    lines: saleLines,
  });

  order.journalEntryId = saleEntry._id;
  await order.save();

  await Payment.create({
    companyId,
    orderId: order._id,
    gateway,
    amount: orderTotal,
    currency: 'USD',
    transactionId: transactionId || `txn_${orderNumber}`,
    paymentDate: paymentDate || createdAt || new Date(),
    status: 'success',
  });

  // COGS / inventory reduction
  if (costOfGoods > 0) {
    await postJournalEntry({
      companyId,
      date: createdAt || new Date(),
      reference: `${orderNumber}-COGS`,
      description: `COGS for order ${orderNumber}`,
      createdBy: userId,
      sourceType: 'inventory',
      sourceId: order._id,
      lines: [
        { systemKey: 'cogs', debit: round2(costOfGoods), memo: 'Cost of goods sold' },
        { systemKey: 'inventory', credit: round2(costOfGoods), memo: 'Inventory relief' },
      ],
    });
  }

  for (const item of lineItems) {
    if (!item.productId || !item.quantity) continue;
    const inv = await Inventory.findOne({ companyId, productId: item.productId });
    if (inv) {
      inv.quantity = Math.max(0, inv.quantity - item.quantity);
      await inv.save();
    }
    await InventoryTransaction.create({
      companyId,
      productId: item.productId,
      type: 'Sale',
      quantity: -Math.abs(item.quantity),
      unitCost: item.unitCost || 0,
      date: createdAt || new Date(),
      reference: orderNumber,
    });
  }

  // Shopify processing fee
  if (shopifyFee > 0) {
    await postJournalEntry({
      companyId,
      date: createdAt || new Date(),
      reference: `${orderNumber}-FEE`,
      description: `Shopify fee for ${orderNumber}`,
      createdBy: userId,
      sourceType: 'fee',
      sourceId: order._id,
      lines: [
        { systemKey: 'processing_fees', debit: round2(shopifyFee), memo: 'Merchant fees' },
        { systemKey: 'shopify_clearing', credit: round2(shopifyFee), memo: 'Fee withheld' },
      ],
    });
  }

  await AuditLog.create({
    companyId,
    userId,
    action: 'shopify.order.synced',
    entityType: 'Order',
    entityId: String(order._id),
    detail: `Synced ${orderNumber} · total $${orderTotal} · fee $${shopifyFee}`,
  });

  return order;
}

export async function processRefund(companyId, { orderId, amount, reason, date }, userId = null) {
  const order = await Order.findOne({ _id: orderId, companyId });
  if (!order) throw new Error('Order not found');

  const refundAmount = round2(amount);
  const refund = await Refund.create({
    companyId,
    orderId,
    amount: refundAmount,
    reason: reason || '',
    date: date || new Date(),
  });

  // Reverse revenue portion into refunds expense / clearing
  const entry = await postJournalEntry({
    companyId,
    date: date || new Date(),
    reference: `REF-${order.orderNumber}`,
    description: `Refund for ${order.orderNumber}`,
    createdBy: userId,
    sourceType: 'refund',
    sourceId: refund._id,
    lines: [
      { systemKey: 'refunds', debit: refundAmount, memo: reason || 'Customer refund' },
      { systemKey: 'shopify_clearing', credit: refundAmount, memo: 'Refund from clearing' },
    ],
  });

  refund.journalEntryId = entry._id;
  await refund.save();

  order.financialStatus =
    refundAmount >= order.total ? 'refunded' : 'partially_refunded';
  await order.save();

  return refund;
}

/**
 * Payout: Debit Bank / Credit Shopify Clearing
 */
export async function processPayout(companyId, payload, userId = null) {
  const {
    shopifyPayoutId,
    bankAccount,
    grossSales = 0,
    refunds = 0,
    fees = 0,
    netAmount,
    depositDate,
    status = 'paid',
  } = payload;

  const net = round2(netAmount);
  const payout = await Payout.create({
    companyId,
    shopifyPayoutId,
    bankAccount,
    grossSales: round2(grossSales),
    refunds: round2(refunds),
    fees: round2(fees),
    netAmount: net,
    depositDate: depositDate || new Date(),
    status,
  });

  const entry = await postJournalEntry({
    companyId,
    date: depositDate || new Date(),
    reference: shopifyPayoutId || `PAYOUT-${String(payout._id).slice(-6)}`,
    description: 'Shopify payout deposit',
    createdBy: userId,
    sourceType: 'payout',
    sourceId: payout._id,
    lines: [
      { systemKey: 'bank', debit: net, memo: 'Bank deposit' },
      { systemKey: 'shopify_clearing', credit: net, memo: 'Clear Shopify balance' },
    ],
  });

  payout.journalEntryId = entry._id;
  await payout.save();

  if (bankAccount) {
    await BankTransaction.create({
      companyId,
      bankAccountId: bankAccount,
      date: depositDate || new Date(),
      description: `Shopify payout ${shopifyPayoutId || ''}`.trim(),
      amount: net,
      matched: true,
      journalEntryId: entry._id,
    });
  }

  return payout;
}

export async function processExpense(companyId, payload, userId = null) {
  const { vendorId, accountId, amount, tax = 0, date, paymentMethod = 'bank', receipt = '', notes = '' } =
    payload;
  const total = round2(amount + tax);

  const expense = await Expense.create({
    companyId,
    vendorId,
    accountId,
    amount: round2(amount),
    tax: round2(tax),
    date: date || new Date(),
    paymentMethod,
    receipt,
    notes,
  });

  const cashKey = paymentMethod === 'cash' ? 'cash' : 'bank';
  const entry = await postJournalEntry({
    companyId,
    date: date || new Date(),
    reference: `EXP-${String(expense._id).slice(-6)}`,
    description: notes || 'Expense',
    createdBy: userId,
    sourceType: 'expense',
    sourceId: expense._id,
    lines: [
      { accountId, debit: total, memo: notes || 'Expense' },
      { systemKey: cashKey, credit: total, memo: `Paid via ${paymentMethod}` },
    ],
  });

  expense.journalEntryId = entry._id;
  await expense.save();
  return expense;
}

export async function adjustInventory(companyId, { productId, quantity, unitCost, type, reference, date }, userId = null) {
  const product = await Product.findOne({ _id: productId, companyId });
  if (!product) throw new Error('Product not found');

  let inv = await Inventory.findOne({ companyId, productId });
  if (!inv) {
    inv = await Inventory.create({
      companyId,
      productId,
      quantity: 0,
      averageCost: unitCost || product.cost,
      warehouse: 'Main',
    });
  }

  const qty = Number(quantity);
  if (type === 'Purchase' || (type === 'Adjustment' && qty > 0) || type === 'Return') {
    const newQty = inv.quantity + Math.abs(qty);
    const totalCost = inv.averageCost * inv.quantity + (unitCost || product.cost) * Math.abs(qty);
    inv.averageCost = newQty > 0 ? round2(totalCost / newQty) : inv.averageCost;
    inv.quantity = newQty;

    if (type === 'Purchase') {
      const amount = round2(Math.abs(qty) * (unitCost || product.cost));
      await postJournalEntry({
        companyId,
        date: date || new Date(),
        reference: reference || 'INV-PO',
        description: `Inventory purchase ${product.sku}`,
        createdBy: userId,
        sourceType: 'inventory',
        lines: [
          { systemKey: 'inventory', debit: amount, memo: product.title },
          { systemKey: 'accounts_payable', credit: amount, memo: 'Inventory purchase' },
        ],
      });
    }
  } else {
    inv.quantity = Math.max(0, inv.quantity - Math.abs(qty));
  }

  await inv.save();
  const tx = await InventoryTransaction.create({
    companyId,
    productId,
    type,
    quantity: type === 'Sale' || (type === 'Adjustment' && qty < 0) ? -Math.abs(qty) : Math.abs(qty),
    unitCost: unitCost || product.cost,
    date: date || new Date(),
    reference: reference || '',
  });

  return { inventory: inv, transaction: tx };
}
