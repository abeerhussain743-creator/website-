# Maxtrone Campus

WhatsApp-first, Urdu-friendly multi-tenant SaaS for schools, coaching academies, and training centers in Pakistan.

Product requirements: [docs/PRD.md](./docs/PRD.md)

**Phases 0–3 are implemented** on branch `cursor/maxtrone-phase-2-3-219f`  
PR: https://github.com/abeerhussain743-creator/website-/pull/13

## Stack

- **Web:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui
- **Auth:** Better Auth
- **DB:** PostgreSQL + Prisma
- **Jobs:** BullMQ + Redis (`apps/worker`)
- **Providers:** WhatsApp, AI, TTS, voice, payments behind mockable interfaces (mocks by default)

## Monorepo

| Path | Package |
|------|---------|
| `apps/web` | Dashboard, parent portal, API routes, webhooks |
| `apps/worker` | Messaging, AI, schedules, reports, OMR, risk, ROI |
| `packages/db` | Prisma schema, tenant-scoped client, seed |
| `packages/core` | Domain logic (fees, admissions, tutor safety, ROI…) |
| `packages/providers` | External service adapters + mocks |
| `packages/ui` | Design system |

## Get the code

```bash
git clone https://github.com/abeerhussain743-creator/website-.git
cd website-
git checkout cursor/maxtrone-phase-2-3-219f
```

Or download the PR branch as a ZIP from GitHub:  
https://github.com/abeerhussain743-creator/website-/tree/cursor/maxtrone-phase-2-3-219f

## Requirements

- Node.js **≥ 20**
- **pnpm** 10 (`corepack enable && corepack prepare pnpm@10.33.3 --activate`)
- Docker (for Postgres + Redis) **or** local Postgres 16 + Redis 7

## Quick start

```bash
cp .env.example .env
docker compose up -d          # Postgres :5432 + Redis :6379
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed

# Terminal 1 — web
pnpm dev                      # http://localhost:3000

# Terminal 2 — background jobs
pnpm dev:worker
```

### Demo logins (after seed)

| Role | Email | Password |
|------|-------|----------|
| School owner | `owner@greenfield.edu.pk` | `password123` |
| Super-admin | `superadmin@maxtrone.local` | `password123` |

## What’s included (Phases 0–3)

- **Phase 0:** Auth, app shell, tenant DB, providers, worker, seed, CI  
- **Phase 1:** Students/import, attendance, admissions CRM + AI, fees + recovery, WhatsApp inbox, broadcasts, 8am briefing, dashboard  
- **Phase 2:** Voice notes/calls, parent helpdesk, tests/marks/OMR, progress notes, risk, monthly ROI, referrals, Instagram DMs  
- **Phase 3:** AI tutor + safety + subscriptions, surveys, competitor watch, transport, parent magic-link portal  

## Useful commands

```bash
pnpm test           # unit tests
pnpm typecheck
pnpm db:seed        # re-seed demo data
```

## Notes

- External services default to **mocks** (`AI_PROVIDER=mock`, `MESSAGING_PROVIDER=mock`, etc.).
- Money is stored as integer **paisa** (PKR × 100).
- All tenant data is scoped by `institutionId`.
