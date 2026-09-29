# PostPilot AI — System Architecture

**Product:** PostPilot AI  
**Positioning:** Your AI social media team — strategist, copywriter, designer, and scheduler in one.  
**Principle:** Async-first. Every long-running task is a BullMQ job. Every external provider sits behind a swappable adapter. Never publish unapproved content.

> **Phase gate:** Folder structure + Prisma schema are proposed below for owner approval. Implementation of the rest of Phase 1 starts only after go-ahead. See `docs/DECISIONS.md`.

---

## 1. High-level system

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  apps/web   │────▶│  PostgreSQL  │◀────│  apps/worker    │
│  Next.js    │     │  + pgvector  │     │  BullMQ workers │
│  Auth.js    │     └──────────────┘     └────────┬────────┘
└──────┬──────┘              ▲                    │
       │                     │                    ▼
       │              ┌──────┴──────┐     ┌───────────────┐
       └─────────────▶│    Redis    │     │ apps/scraper  │
                      │   BullMQ    │     │ FastAPI + PW  │
                      └─────────────┘     └───────────────┘
                             │
         packages: db · ai · social · design · shared · jobs · storage
```

| Runtime | Role |
|---------|------|
| `apps/web` | UI, Auth.js, tRPC/REST API routes, SSE/polling for job progress |
| `apps/worker` | BullMQ consumers, cron/repeatable jobs, weekly pipeline orchestration |
| `apps/scraper` | Research/scraping microservice (Python); called only from worker |
| Postgres | System of record + pgvector embeddings |
| Redis | Queue + short-lived locks/caches |
| R2 / MinIO | Media and rendered design assets |

---

## 2. Proposed monorepo folder structure

```
postpilot/
├── apps/
│   ├── web/                          # Next.js App Router (UI + API)
│   │   ├── app/
│   │   │   ├── (marketing)/          # Landing, pricing
│   │   │   ├── (auth)/               # Sign-in, magic-link callback
│   │   │   ├── (app)/                # Authenticated shell
│   │   │   │   ├── dashboard/
│   │   │   │   ├── onboarding/
│   │   │   │   ├── brand/
│   │   │   │   ├── competitors/      # Phase 3+
│   │   │   │   ├── calendar/         # Phase 5+
│   │   │   │   ├── review/           # Phase 7+
│   │   │   │   ├── analytics/        # Phase 9+
│   │   │   │   ├── settings/
│   │   │   │   └── admin/            # Phase 10+
│   │   │   ├── approve/[token]/      # Magic-link approval (Phase 7)
│   │   │   └── api/
│   │   │       ├── auth/[...nextauth]/
│   │   │       ├── jobs/[id]/stream/ # SSE progress
│   │   │       └── webhooks/
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui
│   │   │   ├── onboarding/
│   │   │   ├── brand/
│   │   │   └── layout/
│   │   ├── lib/                      # server helpers, auth, rbac
│   │   └── styles/
│   │
│   ├── worker/                       # Node TS BullMQ consumers
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── queues/
│   │   │   ├── processors/           # one file per job type
│   │   │   ├── flows/                # weekly pipeline flow
│   │   │   └── schedulers/
│   │   └── package.json
│   │
│   └── scraper/                      # Python FastAPI microservice
│       ├── app/
│       │   ├── main.py
│       │   ├── routers/
│       │   ├── adapters/             # Playwright / Apify / httpx
│       │   └── schemas/
│       ├── tests/
│       ├── pyproject.toml
│       └── Dockerfile
│
├── packages/
│   ├── db/                           # Prisma schema + client + seed
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # ← proposed below / in repo
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/index.ts
│   │
│   ├── shared/                       # Types, enums mirrors, utils, crypto helpers
│   │   └── src/
│   │
│   ├── ai/                           # LLM + image adapters, Zod schemas, prompts
│   │   └── src/
│   │       ├── adapters/
│   │       ├── prompts/
│   │       ├── schemas/
│   │       └── cost.ts
│   │
│   ├── social/                       # Platform OAuth, publish, analytics adapters
│   │   └── src/
│   │       ├── adapters/
│   │       ├── tokens.ts             # AES-256-GCM encrypt/decrypt
│   │       └── types.ts
│   │
│   ├── design/                       # Satori templates → PNG (Remotion later)
│   │   └── src/
│   │       ├── templates/
│   │       ├── render.ts
│   │       └── brand-apply.ts
│   │
│   ├── jobs/                         # Queue names, producers, job payloads (Zod)
│   │   └── src/
│   │
│   └── storage/                      # S3/R2/MinIO adapter
│       └── src/
│
├── tooling/
│   ├── eslint/
│   └── typescript/
│
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md               # this file
│   ├── DECISIONS.md
│   ├── PLATFORM_SETUP.md             # Phase 4+
│   └── FOLDER_STRUCTURE.md           # stable copy of Section 2
│
├── docker-compose.yml                # postgres (pgvector), redis, minio
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .github/workflows/ci.yml
└── README.md
```

### Phase 1 implements (after schema approval)

| Area | Scope |
|------|--------|
| Monorepo scaffolding | Turborepo, pnpm, shared tsconfig/eslint |
| `packages/db` | Full schema + migrations + demo seed (org/workspace/brand kit) |
| Auth | Auth.js email magic link + Google; session → Membership |
| Tenancy | Organization, Workspace, Membership roles |
| Onboarding | Multi-step wizard (saves progress), brand kit upload |
| UI shell | App layout, nav, empty states, light/dark |
| CI | lint, typecheck, unit test |
| Docs | README, `.env.example`, ARCHITECTURE, DECISIONS |

Packages `ai`, `social`, `design`, `scraper` are **scaffolded with interfaces only** in Phase 1 (or deferred empty until their phase) — no fake production paths.

---

## 3. Package dependency rules

```
web ──────────▶ db, shared, jobs, storage, ai*, social*, design*
worker ───────▶ db, shared, jobs, storage, ai*, social*, design*
scraper ──────▶ (standalone; HTTP contract documented in shared)

* Phase-gated: imported when that phase lands.
```

- No app imports another app.
- `db` never imports `ai` / `social` / `design`.
- Adapters never import Prisma directly; workers orchestrate.

---

## 4. Multi-tenancy & security

1. **Organization** = billing + team boundary.  
2. **Workspace** = one brand/client; all content rows carry `workspaceId`.  
3. **Membership.role**: `OWNER | ADMIN | EDITOR | CLIENT_APPROVER`.  
4. API routes: Zod validate → resolve session → assert membership → scope query by `workspaceId`.  
5. Social tokens: AES-256-GCM at rest (`SocialAccount` encrypted fields).  
6. Magic approval links: signed, expiring, single-use or version-bound (Phase 7).

---

## 5. Data model overview

See `packages/db/prisma/schema.prisma` (proposed). Logical groups:

| Group | Models |
|-------|--------|
| Identity & tenancy | User, Account, Session, VerificationToken, Organization, Membership, Workspace |
| Brand | BrandProfile, BrandDNA, BrandKit, MediaAsset |
| Social | SocialAccount, AccountSnapshot, StageReport |
| Competitors | Competitor, CompetitorSnapshot, CompetitorPost, NichePlaybook |
| Content | ContentPlan, PlannedPost, PostDraft, DesignAsset, CalendarEvent |
| Approval | Approval, Comment, ApprovalMagicLink |
| Publishing | ScheduledJob, PublishedPost, PostMetric |
| Learning | WeeklyReport |
| SaaS | Subscription, CreditLedger, AICallLog, AuditLog, FeatureFlag |

Enums cover platform, format, pillar, stage, approval status, plan, job status, competitor tier, etc.

**pgvector:** `CompetitorPost.embedding` and `PostDraft.embedding` / brand-voice embeddings as `Unsupported("vector")` with a SQL migration enabling the extension.

---

## 6. Weekly pipeline (Phases 3–9)

Implemented as a BullMQ **Flow** with per-step UI status:

```
refreshCompetitors → analyzeCompetitorPosts → updateNichePlaybook
  → syncOwnAccountMetrics → diagnoseStage
  → buildWeeklyPlan → generatePosts → qualityCritic
  → renderDesigns → notifyForApproval
[on approve] → schedulePublishJobs
[at time] → publishPost → scheduleMetricPulls → updatePerformance
```

---

## 7. Deploy targets

| Service | Target |
|---------|--------|
| web | Vercel |
| worker | Railway / Fly.io |
| scraper | Railway / Fly.io |
| Redis | Railway / Upstash |
| Postgres | Neon or Supabase (pgvector) |
| Media | Cloudflare R2 |

---

## 8. Phase roadmap

| Phase | Focus |
|-------|--------|
| 1 | Foundation (this document + schema → then auth/onboarding/UI/CI) |
| 2 | Brand DNA + LLM adapters |
| 3 | Competitor intelligence + scraper |
| 4 | Social OAuth + stage engine |
| 5 | Planner + generation + quality pipeline |
| 6 | Design engine |
| 7 | Approval workflow |
| 8 | Scheduler & publisher |
| 9 | Analytics + learning + weekly reports |
| 10 | Stripe, agency, white-label, admin |
| 11 | LinkedIn/X/TikTok, Remotion, Trend Radar, WhatsApp |

---

## 9. Approval checklist (owner)

Please confirm or amend:

- [ ] Folder structure in Section 2
- [ ] Prisma schema in `packages/db/prisma/schema.prisma`
- [ ] ADRs in `docs/DECISIONS.md` (especially greenfield replace + Auth.js)
- [ ] Embedding dimension default **1536**

Reply with **“approved”** or a punch-list of changes; Phase 1 implementation continues after that.
