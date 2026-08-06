import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  Company,
  Account,
  Customer,
  Vendor,
  Product,
  Inventory,
  BankAccount,
  Tax,
  Expense,
  Order,
  Payout,
  JournalEntry,
  JournalLine,
  Payment,
  Refund,
  InventoryTransaction,
  BankTransaction,
  AuditLog,
  Attachment,
} from '../models/index.js';
import { DEFAULT_ACCOUNTS } from './chartOfAccounts.js';
import { processShopifyOrder, processPayout, processExpense } from '../services/shopifyAutomation.js';
import { postJournalEntry } from '../services/accountingService.js';

export async function seedDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Account.deleteMany({}),
    Customer.deleteMany({}),
    Vendor.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    InventoryTransaction.deleteMany({}),
    BankAccount.deleteMany({}),
    BankTransaction.deleteMany({}),
    Tax.deleteMany({}),
    Expense.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Refund.deleteMany({}),
    Payout.deleteMany({}),
    JournalEntry.deleteMany({}),
    JournalLine.deleteMany({}),
    AuditLog.deleteMany({}),
    Attachment.deleteMany({}),
  ]);

  const company = await Company.create({
    companyName: 'Northwind Outfitters',
    currency: 'USD',
    country: 'US',
    fiscalYearStart: 1,
    timezone: 'America/New_York',
  });

  const user = await User.create({
    companyId: company._id,
    name: 'Ava Ledger',
    email: 'demo@meridian.books',
    password: 'demo1234',
    role: 'owner',
  });

  const accounts = await Account.insertMany(
    DEFAULT_ACCOUNTS.map((a) => ({ ...a, companyId: company._id, isActive: true }))
  );
  const byKey = Object.fromEntries(accounts.filter((a) => a.systemKey).map((a) => [a.systemKey, a]));

  // Opening balances: equity funds bank + inventory
  await postJournalEntry({
    companyId: company._id,
    date: new Date('2026-01-01'),
    reference: 'OPEN-001',
    description: 'Opening balances',
    createdBy: user._id,
    sourceType: 'adjustment',
    lines: [
      { systemKey: 'bank', debit: 25000, memo: 'Opening bank' },
      { systemKey: 'cash', debit: 1500, memo: 'Opening cash' },
      { systemKey: 'inventory', debit: 14000, memo: 'Opening inventory' },
      { systemKey: 'owner_equity', credit: 40500, memo: 'Owner capital' },
    ],
  });

  const customer = await Customer.create({
    companyId: company._id,
    shopifyCustomerId: 'gid://shopify/Customer/1001',
    name: 'Jordan Hale',
    email: 'jordan@example.com',
    phone: '+1-555-0142',
    country: 'US',
  });

  await Customer.create({
    companyId: company._id,
    shopifyCustomerId: 'gid://shopify/Customer/1002',
    name: 'Sam Rivera',
    email: 'sam@example.com',
    phone: '+1-555-0199',
    country: 'US',
  });

  const vendorShopify = await Vendor.create({
    companyId: company._id,
    name: 'Shopify',
    email: 'billing@shopify.com',
    paymentTerms: 'Due on receipt',
  });

  const vendorAds = await Vendor.create({
    companyId: company._id,
    name: 'Meta Ads',
    email: 'ads@meta.com',
    paymentTerms: 'Net 15',
  });

  const product = await Product.create({
    companyId: company._id,
    shopifyProductId: 'gid://shopify/Product/501',
    sku: 'NW-TRAIL-01',
    title: 'Trail Pack Pro',
    cost: 70,
    price: 150,
    inventoryAccount: byKey.inventory._id,
    incomeAccount: byKey.product_sales._id,
    expenseAccount: byKey.cogs._id,
  });

  await Product.create({
    companyId: company._id,
    shopifyProductId: 'gid://shopify/Product/502',
    sku: 'NW-SOCK-02',
    title: 'Merino Trail Socks',
    cost: 6,
    price: 22,
    inventoryAccount: byKey.inventory._id,
    incomeAccount: byKey.product_sales._id,
    expenseAccount: byKey.cogs._id,
  });

  await Inventory.create({
    companyId: company._id,
    productId: product._id,
    quantity: 180,
    averageCost: 70,
    warehouse: 'Main',
  });

  const bank = await BankAccount.create({
    companyId: company._id,
    bankName: 'Chase Business Checking',
    accountNumber: '****4821',
    currency: 'USD',
    openingBalance: 25000,
    glAccountId: byKey.bank._id,
  });

  await Tax.create({
    companyId: company._id,
    country: 'US',
    state: 'NY',
    rate: 0.08,
    accountId: byKey.sales_tax_payable._id,
    name: 'NY Sales Tax',
  });

  // Spec example: $150 sale + $10 shipping + $12 tax, $5 fee, $70 COGS
  const orderDate = new Date('2026-07-15T14:30:00Z');
  await processShopifyOrder(
    company._id,
    {
      shopifyOrderId: 'gid://shopify/Order/9001',
      customerId: customer._id,
      orderNumber: '#1042',
      subtotal: 150,
      discount: 0,
      tax: 12,
      shipping: 10,
      total: 172,
      costOfGoods: 70,
      shopifyFee: 5,
      financialStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      createdAt: orderDate,
      paymentDate: orderDate,
      transactionId: 'ch_demo_1042',
      lineItems: [
        {
          productId: product._id,
          title: product.title,
          quantity: 1,
          unitPrice: 150,
          unitCost: 70,
        },
      ],
    },
    user._id
  );

  // Additional orders for dashboard richness
  await processShopifyOrder(
    company._id,
    {
      shopifyOrderId: 'gid://shopify/Order/9002',
      customerId: customer._id,
      orderNumber: '#1043',
      subtotal: 300,
      discount: 20,
      tax: 22.4,
      shipping: 0,
      total: 302.4,
      costOfGoods: 140,
      shopifyFee: 8.77,
      createdAt: new Date('2026-07-22T11:00:00Z'),
      lineItems: [
        {
          productId: product._id,
          title: product.title,
          quantity: 2,
          unitPrice: 150,
          unitCost: 70,
        },
      ],
    },
    user._id
  );

  await processShopifyOrder(
    company._id,
    {
      shopifyOrderId: 'gid://shopify/Order/9003',
      orderNumber: '#1044',
      subtotal: 150,
      tax: 12,
      shipping: 10,
      total: 172,
      costOfGoods: 70,
      shopifyFee: 5,
      createdAt: new Date('2026-08-01T16:20:00Z'),
      lineItems: [
        {
          productId: product._id,
          title: product.title,
          quantity: 1,
          unitPrice: 150,
          unitCost: 70,
        },
      ],
    },
    user._id
  );

  // Payout for first order: clearing 172 - fee 5 = 167
  await processPayout(
    company._id,
    {
      shopifyPayoutId: 'po_demo_7781',
      bankAccount: bank._id,
      grossSales: 172,
      refunds: 0,
      fees: 5,
      netAmount: 167,
      depositDate: new Date('2026-07-18'),
      status: 'paid',
    },
    user._id
  );

  await processExpense(
    company._id,
    {
      vendorId: vendorAds._id,
      accountId: byKey.advertising._id,
      amount: 450,
      tax: 0,
      date: new Date('2026-07-10'),
      paymentMethod: 'bank',
      notes: 'July Meta ads',
    },
    user._id
  );

  await processExpense(
    company._id,
    {
      vendorId: vendorShopify._id,
      accountId: byKey.shopify_subscription._id,
      amount: 105,
      tax: 0,
      date: new Date('2026-08-01'),
      paymentMethod: 'bank',
      notes: 'Shopify Plus subscription',
    },
    user._id
  );

  console.log('Seed complete');
  console.log('  Demo login: demo@meridian.books / demo1234');
  console.log(`  Company: ${company.companyName}`);
  return { company, user };
}

const isDirect = process.argv[1] && process.argv[1].includes('seed.js');
if (isDirect) {
  await connectDB();
  await seedDatabase();
  await disconnectDB();
  process.exit(0);
}
