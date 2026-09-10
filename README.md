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

| Email | Password | Role |
|-------|----------|------|
| `jordan@apexmetalworks.com` | `demo1234` | Owner |
| `sofia@apexmetalworks.com` | `demo1234` | Salesperson |
| `mike@apexmetalworks.com` | `demo1234` | Production Manager |

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
