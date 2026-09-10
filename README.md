# Forge

**AI-powered operating system for manufacturing businesses.**

Forge is not only a place to store plant data — it **analyzes results and proposes/executes decisions** (shortage buys, dispatch holds, QC blocks, maintenance, invoicing).

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Launch OS** → sign in.

### Demo login

| Email | Password | Role |
|-------|----------|------|
| `jordan@apexmetalworks.com` | `demo1234` | Owner |
| `sofia@apexmetalworks.com` | `demo1234` | Salesperson |
| `mike@apexmetalworks.com` | `demo1234` | Production Manager |

## Decision OS (Phases 1–4)

| Phase | Capability |
|---|---|
| **1 System of record** | Quote→SO, shortage→PO, receive stock, complete production→FG, invoice, dispatch |
| **2 Rules** | Auto-propose shortage buys, overdue AR holds, QC blocks, PM scheduling, margin flags |
| **3 AI Copilot** | Live explainers from tenant metrics (profit, steel cover, line efficiency, AR, QC) |
| **4 Execute** | Approve / reject / execute / human override + optional auto-execute |

Open **Decision Center** (`/app/decisions`) after login.

## Stack

- Next.js 15 + TypeScript + Tailwind 4
- Cookie session auth
- File-backed tenant store (`data/tenant.json`)
- Rule engine + AI analyzer + action queue

## Docs

- `docs/PRODUCT_BLUEPRINT.md`
- `docs/FINANCIAL_PROJECTION.md`
