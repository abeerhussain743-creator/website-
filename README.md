# ShopData

Shopify data management SaaS — import, export, and bulk-update store data with spreadsheet-friendly workflows.

## Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full system design (product, schema, pipelines, security, roadmap).

## Stack

- **Web:** Next.js · React · TypeScript · Tailwind
- **Workers:** Node.js · BullMQ · Redis
- **DB:** PostgreSQL · Prisma
- **Files:** S3-compatible (MinIO locally)
- **Shopify:** Admin GraphQL + Bulk Operations · OAuth

## Quick start

```bash
# 1. Infrastructure
cp .env.example .env
docker compose up -d

# 2. Install & DB
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run db:seed:demo

# 3. App
npm run dev

# 4. Worker (separate terminal)
npm run dev:worker
```

Web: http://localhost:3000

### Windows (Command Prompt)

```bat
copy .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run db:seed:demo
npm run dev
```

In a second terminal: `npm run dev:worker`

DB scripts load the **repo-root** `.env` automatically (no need to copy into `packages\db`).
Docker Desktop must be installed and running for Postgres/Redis/MinIO.

## MVP scope

- Shopify OAuth + store connection (demo seed supported)
- Dashboard
- Product import (CSV / XLSX) with field mapping, validation, preview
- Product export (CSV / XLSX) via Bulk Operations
- Product bulk update (price / compare-at / inventory / status / tags)
- Saved import field mappings + column templates
- Background jobs, progress, error reports, retry failed rows
- Local disk or S3/MinIO artifact storage
- Dry-run mode for demo tokens / `SHOPDATA_DRY_RUN=true`

## Workspaces

| Path | Package |
|------|---------|
| `apps/web` | Next.js UI + API |
| `apps/worker` | Job workers |
| `packages/db` | Prisma schema |
| `packages/shared` | Shared types/utils |
| `packages/shopify` | OAuth + GraphQL client |
| `packages/files` | Parse / map / validate / XLSX |
| `packages/jobs` | Queue producers/consumers |
| `packages/storage` | Local disk / S3 object storage |

## Demo

```bash
npm run db:seed:demo
# Then open http://localhost:3000/app/stores and use the Demo Store.
# Imports/exports/bulk-updates run in dry-run mode for the demo token.
```

