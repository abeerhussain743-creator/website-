/** Default chart of accounts with systemKey for Shopify automation */
export const DEFAULT_ACCOUNTS = [
  // Assets
  { accountNumber: '1000', accountName: 'Cash', accountType: 'Asset', systemKey: 'cash' },
  { accountNumber: '1010', accountName: 'Bank', accountType: 'Asset', systemKey: 'bank' },
  { accountNumber: '1020', accountName: 'Shopify Balance', accountType: 'Asset', systemKey: 'shopify_balance' },
  { accountNumber: '1030', accountName: 'Shopify Clearing', accountType: 'Asset', systemKey: 'shopify_clearing' },
  { accountNumber: '1100', accountName: 'Accounts Receivable', accountType: 'Asset', systemKey: 'accounts_receivable' },
  { accountNumber: '1200', accountName: 'Inventory', accountType: 'Asset', systemKey: 'inventory' },
  { accountNumber: '1300', accountName: 'Prepaid Expenses', accountType: 'Asset', systemKey: 'prepaid_expenses' },
  // Liabilities
  { accountNumber: '2000', accountName: 'Accounts Payable', accountType: 'Liability', systemKey: 'accounts_payable' },
  { accountNumber: '2100', accountName: 'Shopify Fees Payable', accountType: 'Liability', systemKey: 'shopify_fees_payable' },
  { accountNumber: '2200', accountName: 'Sales Tax Payable', accountType: 'Liability', systemKey: 'sales_tax_payable' },
  // Equity
  { accountNumber: '3000', accountName: 'Owner Equity', accountType: 'Equity', systemKey: 'owner_equity' },
  { accountNumber: '3100', accountName: 'Retained Earnings', accountType: 'Equity', systemKey: 'retained_earnings' },
  // Revenue
  { accountNumber: '4000', accountName: 'Product Sales', accountType: 'Revenue', systemKey: 'product_sales' },
  { accountNumber: '4100', accountName: 'Shipping Income', accountType: 'Revenue', systemKey: 'shipping_income' },
  { accountNumber: '4200', accountName: 'Discount Recovery', accountType: 'Revenue', systemKey: 'discount_recovery' },
  // Expenses
  { accountNumber: '5000', accountName: 'Cost of Goods Sold', accountType: 'Expense', systemKey: 'cogs' },
  { accountNumber: '5100', accountName: 'Advertising', accountType: 'Expense', systemKey: 'advertising' },
  { accountNumber: '5200', accountName: 'Shopify Subscription', accountType: 'Expense', systemKey: 'shopify_subscription' },
  { accountNumber: '5300', accountName: 'Processing Fees', accountType: 'Expense', systemKey: 'processing_fees' },
  { accountNumber: '5400', accountName: 'Shipping Labels', accountType: 'Expense', systemKey: 'shipping_labels' },
  { accountNumber: '5500', accountName: 'Refunds', accountType: 'Expense', systemKey: 'refunds' },
  { accountNumber: '5600', accountName: 'Salaries', accountType: 'Expense', systemKey: 'salaries' },
];
