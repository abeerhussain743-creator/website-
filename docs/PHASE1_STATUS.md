# Phase 1 — Status

**Status:** Implemented — awaiting owner review before Phase 2

## Delivered

- Turborepo + pnpm monorepo (`apps/web`, `apps/worker`, `apps/scraper` stub)
- Packages: `db`, `shared`, `jobs`, `storage`, stubs for `ai` / `social` / `design`
- Full Prisma schema + seed (`demo@postpilot.ai` / Lumen Café)
- Auth.js: magic link, optional Google, `AUTH_DEV_LOGIN` credentials
- Organizations / workspaces / membership roles + RBAC helpers
- Onboarding wizard (business → audience → tone → brand kit → social skip → review)
- Brand kit colors/fonts + logo upload (local storage driver)
- App shell: dashboard, brand, settings, light/dark
- Worker BullMQ ping consumer
- CI: lint, typecheck, test
- Docs: PRODUCT_SPEC, ARCHITECTURE, DECISIONS, README, `.env.example`

## How to run

```bash
cp .env.example .env
# Postgres + Redis (docker compose up -d) OR local postgres/redis
pnpm install
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev
```

Open http://localhost:3000 → Sign in → Dev login as `demo@postpilot.ai`.

## How to test

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Manual: complete onboarding, upload a logo, confirm Brand + Settings pages.
