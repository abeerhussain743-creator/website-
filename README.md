# PostPilot AI

Premium autonomous social media content system.

Positioning: **Your AI social media team — strategist, copywriter, designer, and scheduler in one.**

## Phase 1 (this release)

Monorepo foundation, Postgres schema (pgvector-ready), Auth.js, organizations/workspaces/roles, onboarding wizard, brand kit upload, app shell, worker ping consumer, CI.

## Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000  
- Dev login: `demo@postpilot.ai` (requires `AUTH_DEV_LOGIN=true`)  
- Worker runs alongside web via `pnpm dev`

## Stack

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo + pnpm |
| Web | Next.js App Router, Tailwind, Framer Motion |
| Auth | Auth.js (magic link + Google + local dev login) |
| DB | PostgreSQL + Prisma + pgvector |
| Queue | Redis + BullMQ |
| Storage | S3-compatible (MinIO locally / R2 in prod) |

## Workspace map

See `docs/FOLDER_STRUCTURE.md` and `docs/ARCHITECTURE.md`.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Web + worker |
| `pnpm db:push` | Sync Prisma schema |
| `pnpm db:seed` | Demo org/workspace |
| `pnpm lint` / `typecheck` / `test` | CI checks |

## Docs

- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/PHASE1_PROPOSAL.md`

## Phase gate

After Phase 1 review, continue with Phase 2 (Brand DNA + LLM adapters).
