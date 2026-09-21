# Meridian — Production Shopify Bookkeeping

Double-entry bookkeeping for Shopify stores with live OAuth/webhooks, bank CSV import, fiscal close, Excel/PDF exports, RBAC, and Docker deployment.

## Stack

- **MongoDB** (required in production; in-memory fallback for local demos)
- **Express / Node.js** with Helmet, rate limits, validation
- **React (Vite)** dashboard
- **Shopify Admin API** OAuth + HMAC webhooks

## Quick start (development)

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

(Exact seeded credentials are printed in the API console on boot.)

## Production (Docker)

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build -d
```

App/API: http://localhost:5000

Set Shopify credentials in the environment or a `.env` file next to `docker-compose.yml`:

```bash
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
CLIENT_URL=https://books.example.com
PUBLIC_API_URL=https://books.example.com
```

Shopify app callback URL:

```
https://books.example.com/api/shopify/callback
```

Webhook (orders/create):

```
https://books.example.com/api/shopify/webhooks/orders-create
```

## Production without Docker

```bash
npm install --prefix server
npm install --prefix client
npm run build --prefix client
cp server/.env.example server/.env   # fill MONGODB_URI + JWT_SECRET
NODE_ENV=production npm start --prefix server
```

## Environment

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Persistent MongoDB (**required in production**) |
| `JWT_SECRET` | JWT signing secret (**required, 32+ chars in production**) |
| `CLIENT_URL` | CORS / OAuth redirect origin |
| `PUBLIC_API_URL` | Public API base for Shopify callbacks |
| `SEED_ON_START` | Seed demo data (`true`/`false`) |
| `TRUST_PROXY` | Set `true` behind reverse proxies |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Shopify app credentials |

## Security & ops

- Helmet security headers + rate limiting
- Password policy on registration
- Role-based access: owner · admin · accountant · viewer
- Tenant isolation on every JWT
- Shopify OAuth HMAC + webhook HMAC verification
- Graceful shutdown + `/api/health` and `/api/ready`

## Modules

Financial Dashboard · P&L · Balance Sheet · Cash Flow · General Ledger · Trial Balance · Shopify Sales · Inventory · Bank Reconciliation (CSV import) · Payout Reconciliation · Expenses · Customers · Vendors · Tax Reports · Fiscal Year Closing · Settings (Shopify + exports) · Audit Log · Excel/PDF export

## Tests

```bash
npm test --prefix server
```
