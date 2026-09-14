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

# 3. App
npm run dev

# 4. Worker (separate terminal)
npm run dev:worker
```

Web: http://localhost:3000

## MVP scope

- Shopify OAuth + store connection
- Dashboard
- Product import / export / bulk update
- Field mapping, validation, preview
- Background jobs, progress, errors, retry

## Workspaces

| Path | Package |
|------|---------|
| `apps/web` | Next.js UI + API |
| `apps/worker` | Job workers |
| `packages/db` | Prisma schema |
| `packages/shared` | Shared types/utils |
| `packages/shopify` | OAuth + GraphQL client |
| `packages/files` | Parse / map / validate |
| `packages/jobs` | Queue producers/consumers |
| `packages/storage` | Local disk / S3 object storage |
