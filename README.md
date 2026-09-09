# Forge

**AI-powered operating system for manufacturing businesses.**

Forge is a multi-module Manufacturing Management SaaS — built around the real operational loop (sales → purchase → inventory → production → QC → warehouse → invoice), not a generic CRM/ERP.

This repository contains:

- Interactive **Phase 1+ product demo** (Apex Metalworks tenant)
- Demo **login + session auth**
- **API-backed persistence** for quote conversion, production start, and shortage POs
- Full **module surfaces** for all 12 product areas
- [Product blueprint](docs/PRODUCT_BLUEPRINT.md)
- [12-month financial projection](docs/FINANCIAL_PROJECTION.md)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then **Launch OS** to sign in.

### Demo login

| Email | Password | Role |
|-------|----------|------|
| `jordan@apexmetalworks.com` | `demo1234` | Owner |
| `sofia@apexmetalworks.com` | `demo1234` | Salesperson |
| `mike@apexmetalworks.com` | `demo1234` | Production Manager |

## Demo highlights

| Area | What to try |
|---|---|
| Login | Session cookie auth gates `/app` |
| Sales | Convert quotation → sales order (persisted) |
| Production | BOM shortage → purchase request (persisted) |
| Settings | Reset tenant seed data |
| AI Copilot | Profit / shortage / line-efficiency insights |

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- Recharts
- File-backed tenant store (`data/tenant.json`)
- Cookie session auth (demo)

## Product phases

1. **MVP:** Sales, Purchase, Inventory, Production, Basic Accounts  
2. **BOM / WO / QC / Warehouse / Costing**  
3. **HR / Payroll / Maintenance / Advanced finance**  
4. **AI Copilot + predictive alerts**  
5. **Multi-plant + API + enterprise**

Initial vertical: **metal fabrication & components**.

## Docs

- `docs/PRODUCT_BLUEPRINT.md`
- `docs/FINANCIAL_PROJECTION.md`
