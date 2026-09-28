# PostPilot AI — Proposed Folder Structure

Canonical copy of the monorepo layout. Source of truth for Phase 1 scaffolding after schema approval. Full context: `docs/ARCHITECTURE.md`.

```
postpilot/
├── apps/
│   ├── web/                          # Next.js App Router (UI + API)
│   │   ├── app/
│   │   │   ├── (marketing)/
│   │   │   ├── (auth)/
│   │   │   ├── (app)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── brand/
│   │   │   │   ├── competitors/
│   │   │   │   ├── calendar/
│   │   │   │   ├── review/
│   │   │   │   ├── analytics/
│   │   │   │   ├── settings/
│   │   │   │   └── admin/
│   │   │   ├── approve/[token]/
│   │   │   └── api/
│   │   │       ├── auth/[...nextauth]/
│   │   │       ├── jobs/[id]/stream/
│   │   │       └── webhooks/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── onboarding/
│   │   │   ├── brand/
│   │   │   └── layout/
│   │   ├── lib/
│   │   └── styles/
│   │
│   ├── worker/                       # Node TS BullMQ consumers
│   │   └── src/
│   │       ├── index.ts
│   │       ├── queues/
│   │       ├── processors/
│   │       ├── flows/
│   │       └── schedulers/
│   │
│   └── scraper/                      # Python FastAPI + Playwright
│       ├── app/
│       │   ├── main.py
│       │   ├── routers/
│       │   ├── adapters/
│       │   └── schemas/
│       ├── tests/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   ├── db/                           # Prisma + seed
│   ├── shared/                       # Types, utils, crypto
│   ├── ai/                           # LLM/image adapters + Zod
│   ├── social/                       # Platform adapters + token crypto
│   ├── design/                       # Satori templates → PNG
│   ├── jobs/                         # Queue producers + job payloads
│   └── storage/                      # S3/R2/MinIO
│
├── tooling/
│   ├── eslint/
│   └── typescript/
│
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── FOLDER_STRUCTURE.md
│   └── PLATFORM_SETUP.md
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .github/workflows/ci.yml
└── README.md
```

## Package map

| Path | Name | Phase introduced |
|------|------|------------------|
| `apps/web` | `@postpilot/web` | 1 |
| `apps/worker` | `@postpilot/worker` | 1 (scaffold), jobs from 2+ |
| `apps/scraper` | scraper service | 3 |
| `packages/db` | `@postpilot/db` | 1 |
| `packages/shared` | `@postpilot/shared` | 1 |
| `packages/jobs` | `@postpilot/jobs` | 1 |
| `packages/storage` | `@postpilot/storage` | 1 |
| `packages/ai` | `@postpilot/ai` | 2 |
| `packages/social` | `@postpilot/social` | 4 |
| `packages/design` | `@postpilot/design` | 6 |
