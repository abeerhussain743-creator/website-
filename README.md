# Forge

**AI-powered operating system for manufacturing businesses.**

Multi-tenant SaaS with self-serve customer onboarding, isolated workspaces, and a Decision OS (rules + AI + execute).

## Quick start

```bash
npm install
npm run dev
```

- Marketing: http://localhost:3000
- **Signup / onboarding:** http://localhost:3000/signup
- Login: http://localhost:3000/login
- App: http://localhost:3000/app

### Demo tenant (already onboarded)

Password for all demo users: `demo1234`

| Email | Role | Lands on |
|-------|------|----------|
| `jordan@apexmetalworks.com` | Owner | Full dashboard + Decision Center |
| `sofia@apexmetalworks.com` | Sales supervisor | Supervisor Desk (customers, quotes) |
| `mike@apexmetalworks.com` | Production supervisor | Supervisor Desk (orders, work orders) |
| `priya@apexmetalworks.com` | Purchase supervisor | Supervisor Desk (suppliers, POs) |
| `devon@apexmetalworks.com` | Stores / warehouse | Supervisor Desk (SKU, stock, bins) |
| `aisha@apexmetalworks.com` | QC supervisor | Supervisor Desk (inspections) |
| `carmen@apexmetalworks.com` | HR supervisor | Supervisor Desk (employees) |
| `noah@apexmetalworks.com` | Accounts supervisor | Supervisor Desk (invoices / bills) |

**Supervisor Desk:** `/app/supervisor` — department forms to enter live plant data.

### New customer flow

1. `/signup` — company + plan + owner account  
2. `/onboarding` — confirm plant details, optional teammate invite  
3. `/app` — isolated tenant workspace + Decision Center  

Tenants are stored under `data/registry.json` + `data/tenants/<companyId>.json`.

## Stack

- Next.js 15 + TypeScript + Tailwind 4
- Multi-tenant registry + per-company file store
- Cookie sessions scoped to company
- Rule engine + AI analyzer + action queue

## Docs

- `docs/PRODUCT_BLUEPRINT.md`
- `docs/FINANCIAL_PROJECTION.md`
