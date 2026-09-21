# Meridian — Shopify Bookkeeping

Double-entry bookkeeping for Shopify: orders, fees, inventory, payouts, bank CSV, fiscal close, Excel/PDF exports.

## Fix: local run (most common issue)

`server/.env.example` is set for **local demo mode**.  
Leave `MONGODB_URI` empty so Meridian uses in-memory MongoDB (no Docker/Mongo install needed).

### Exact steps

```bash
git clone https://github.com/abeerhussain743-creator/website-.git
cd website-
git checkout cursor/shopify-bookkeeping-meridian-9f33

npm install
npm install --prefix server
npm install --prefix client

cp server/.env.example server/.env
# IMPORTANT: keep MONGODB_URI empty for local demo

npm run dev
```

Open: **http://localhost:5173**

### Demo login

| Email | Password |
|-------|----------|
| `demo@meridian.books` | `demo1234` |

API: http://localhost:5000  

If login fails, check the server terminal — it prints the exact demo credentials after seeding.

## Requirements

- Node.js 18+ (`node -v`)
- npm 9+

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ECONNREFUSED mongo:27017` | Set `MONGODB_URI=` (empty) in `server/.env` |
| `concurrently: not found` | Run `npm install` in the repo root |
| Port 5173/5000 in use | Stop other apps, or change `PORT` in `server/.env` |
| Blank page / API errors | Confirm both server + client started (`npm run dev`) |
| Wrong password | Use `demo@meridian.books` / `demo1234` |

## Production (Docker)

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build -d
```

Then open http://localhost:5000

## Shopify (optional)

Set in `server/.env`:

```
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
```

Callback: `https://YOUR_DOMAIN/api/shopify/callback`  
Webhook: `https://YOUR_DOMAIN/api/shopify/webhooks/orders-create`

## Tests

```bash
npm test --prefix server
```
