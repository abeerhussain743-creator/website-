# Maxtrone Campus

WhatsApp-first, Urdu-friendly multi-tenant SaaS for schools, coaching academies, and training centers in Pakistan.

Product requirements: [docs/PRD.md](./docs/PRD.md)

## Stack

- **Web:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui
- **Auth:** Better Auth (organizations plugin)
- **DB:** PostgreSQL + Prisma + pgvector
- **Jobs:** BullMQ + Redis (`apps/worker`)
- **Providers:** WhatsApp, AI, TTS, voice, payments behind mockable interfaces

## Monorepo

| Path | Package |
|------|---------|
| `apps/web` | Dashboard, parent portal, API routes, webhooks |
| `apps/worker` | Messaging, AI, schedules, reports |
| `packages/db` | Prisma schema, tenant-scoped client, seed |
| `packages/core` | Domain logic (fees, permissions, terminology) |
| `packages/providers` | External service adapters + mocks |
| `packages/ui` | Design system |

## Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
pnpm dev          # http://localhost:3000
pnpm dev:worker   # separate terminal
```

Demo login (after seed): `owner@greenfield.edu.pk` / `password123`

## Phase 0 status

Foundation: monorepo, design system, app shell (sidebar / top bar / ⌘K / dark mode), auth + roles, tenant-scoped DB + isolation tests, provider mocks, BullMQ worker, seed data, CI.
