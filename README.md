# Forge

**AI-powered operating system for manufacturing businesses.**

Forge is a multi-module Manufacturing Management SaaS — built around the real operational loop (sales → purchase → inventory → production → QC → warehouse → invoice), not a generic CRM/ERP.

This repository contains:

- Interactive **Phase 1+ product demo** (Apex Metalworks tenant)
- Full **module surfaces** for all 12 product areas
- [Product blueprint](docs/PRODUCT_BLUEPRINT.md) (entities, screens, workflows, phases, pricing)
- [12-month financial projection](docs/FINANCIAL_PROJECTION.md)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the marketing page, then **Launch OS** / **Open demo** for the app at `/app`.

## Demo highlights

| Area | What to try |
|---|---|
| Dashboard | KPIs, alert feed, revenue chart |
| Sales | Convert quotation → sales order |
| Production | BOM explosion, shortage → purchase request, start production |
| Inventory | Reserved vs available, reorder status |
| Accounts | AR/AP, banking, product costing |
| AI Copilot | Profit / shortage / line-efficiency insights |

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS 4
- Recharts
- In-memory multi-module demo store (no DB required)

## Product phases

1. **MVP:** Sales, Purchase, Inventory, Production, Basic Accounts  
2. **BOM / WO / QC / Warehouse / Costing**  
3. **HR / Payroll / Maintenance / Advanced finance**  
4. **AI Copilot + predictive alerts**  
5. **Multi-plant + API + enterprise**

Initial vertical: **metal fabrication & components**.

## Docs

- `docs/PRODUCT_BLUEPRINT.md` — modules, screens, schema, workflows, RBAC, pricing  
- `docs/FINANCIAL_PROJECTION.md` — business model and first-12-months projection
