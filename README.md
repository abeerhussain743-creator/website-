# Relay — AI CRM for Sales Teams

Full-stack CRM demonstrating authentication, CRUD, AI assistance, APIs, dashboards/charts, and payments.

## Stack

- **MongoDB** (+ in-memory fallback for local demos)
- **Express** / **Node.js**
- **React** (Vite)
- **OpenAI** (mock responses when no API key)
- **Stripe** (demo upgrades when no Stripe keys)
- **Socket.io** real-time notifications

## Features

- JWT authentication & role-based permissions (owner, admin, manager, sales)
- Team management with invite codes
- Lead CRUD, activity timeline, Kanban pipeline (drag & drop)
- AI email generation & follow-up suggestions
- Meeting scheduler
- Analytics dashboard (Recharts)
- Real-time notifications
- Subscription plans (Free → Scale) via Stripe or demo mode

## Quick start

```bash
# Install dependencies
npm install
npm install --prefix server
npm install --prefix client

# Configure (optional)
cp server/.env.example server/.env

# Run API + client
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:5000  

### Demo login

| Email | Password | Role |
|-------|----------|------|
| `demo@relay.crm` | `demo1234` | Owner |
| `manager@relay.crm` | `demo1234` | Manager |
| `sam@relay.crm` | `demo1234` | Sales |

Invite code for joining the demo team: `relaydemo`

## Environment

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Persistent MongoDB. Empty → in-memory MongoDB |
| `JWT_SECRET` | JWT signing secret |
| `OPENAI_API_KEY` | Real AI drafts (optional) |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_*` | Live checkout (optional) |
| `CLIENT_URL` | CORS / redirect origin |

Without OpenAI or Stripe keys, the app still runs with high-quality mock AI and instant demo plan upgrades.

## Project structure

```
client/   React SPA
server/   Express API, Socket.io, Stripe webhook, seed data
```

## Skills shown

Authentication · CRUD · AI · APIs · Dashboard · Charts · Payments
