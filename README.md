# Meridian — Shopify Bookkeeping

Double-entry bookkeeping for Shopify stores: orders, fees, inventory, payouts, and financial statements on a scalable chart of accounts.

## Stack

- **MongoDB** (in-memory fallback for local demos)
- **Express / Node.js**
- **React (Vite)** + Recharts + Framer Motion

## Data model

Implements the Shopify bookkeeping schema:

Companies · Chart of Accounts · Journal Entries / Lines · Customers · Vendors · Products · Orders · Payments · Refunds · Payouts · Expenses · Inventory · Inventory Transactions · Bank Accounts / Transactions · Sales Tax · Attachments · Audit Log

### Shopify automation flow

1. Order → invoice in **Shopify Clearing**
2. Credit **Sales**, **Shipping**, **Sales Tax Payable**
3. Debit **COGS** / credit **Inventory**
4. Debit **Processing Fees** / credit **Shopify Clearing**
5. Payout → debit **Bank** / credit **Shopify Clearing**

Seed data includes the worked example: $150 sale + $10 shipping + $12 tax, $5 fee, $70 COGS, $167 payout.

## Quick start

```bash
npm install
npm install --prefix server
npm install --prefix client

cp server/.env.example server/.env

npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:5000  

### Demo login

| Email | Password |
|-------|----------|
| `demo@meridian.books` | `demo1234` |

## Dashboard modules

Financial Dashboard · Profit & Loss · Balance Sheet · Cash Flow · General Ledger · Trial Balance · Shopify Sales · Inventory · Bank Reconciliation · Payout Reconciliation · Expenses · Customers · Vendors · Tax Reports · Fiscal Year Closing · CSV Export · Shopify Sync · Audit Log

## Production

```bash
npm run build
npm start
```

Serves the API and built client from the Express server when `client/dist` exists.

## Environment

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Persistent MongoDB (empty → in-memory) |
| `JWT_SECRET` | JWT signing secret |
| `CLIENT_URL` | CORS origin |
| `SEED_ON_START` | Seed demo data on boot (default true in memory mode) |
