# ShopData — System Architecture

**Temporary product name:** ShopData  
**Positioning:** Make Shopify data operations as easy as uploading a spreadsheet.  
**Principle:** Async-first (Shopify Bulk Operations + queues). Never expose access tokens to the browser.

---

## 1. Product Overview

ShopData is a multi-tenant Shopify data-management SaaS for importing, exporting, bulk-updating, validating, and tracking large Shopify datasets via spreadsheet-friendly workflows.

Merchants upload CSV/XLSX, map columns, validate, preview, run background jobs, monitor progress, download error reports, and retry failed rows — without dealing with GraphQL, rate limits, or bulk JSONL.

---

## 2. Target Customers

| Segment | Needs |
|--------|--------|
| **Merchants (SMB)** | Bulk product/price/inventory updates, imports/exports |
| **Agencies** | Multi-store ops, templates, job history, client workspaces |
| **Developers** | Migration, staging→prod, backups, transformations |
| **Shopify Plus / Enterprise** | Scale, scheduling, audit logs, team permissions |

---

## 3. Competitive Positioning

**Not** “Matrixify but cheaper.” Independent product with own brand, UX, and workflows.

**MVP differentiators (top 5):**

1. **Guided import wizard** — upload → detect → map → validate → preview → run (fewer dead ends)
2. **Error recovery** — row-level errors, suggested fixes, one-click retry of failed rows only
3. **Change detection preview** — creates / updates / unchanged / errors before any write
4. **Modern Shopify-native UI** — premium SaaS clarity, not spreadsheet-admin clutter
5. **Reliability-first jobs** — checkpoints, idempotency, partial completion, resumable workers

Later: AI assistant, visual transforms, supplier automation, store migration.

---

## 4. MVP Feature List

- Shopify OAuth + store connection (tokens server-side only)
- Dashboard (stores, jobs, usage summary)
- Product export (CSV/XLSX) via Bulk Operations
- Product import (CSV/XLSX) with field mapping
- Product bulk update (e.g. price %)
- Validation + preview + change detection
- Background jobs + live progress
- Error reporting + retry failed rows
- Job history

---

## 5. Phase 2 Feature List

- Collections, customers, metafields, redirects, pages
- Scheduled jobs
- Import templates + saved mappings
- Manual + scheduled backups (download; restore where API allows)
- In-app + email notifications
- Configurable billing plans (Shopify Billing)

---

## 6. Phase 3 Feature List

- Store-to-store migration + resource mapping tables
- Transformation rule engine (+ visual builder later)
- Teams / RBAC
- Public API + inbound webhooks (supplier feeds)
- Phase 4: AI data assistant (propose → validate → preview → confirm → execute)

---

## 7. Recommended Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend / API | Next.js Route Handlers + shared service packages |
| Workers | Node.js TypeScript + BullMQ |
| Database | PostgreSQL |
| ORM | Prisma |
| Queue / cache | Redis + BullMQ |
| Files | S3-compatible object storage (MinIO local) |
| Auth | Shopify OAuth (session token / offline token) |
| Shopify API | Admin GraphQL + Bulk Operations (current API version) |
| Infra | Docker Compose local; deployable to Railway / Fly / AWS |

---

## 8. System Architecture

```
┌─────────────┐     HTTPS      ┌──────────────────────┐
│  Merchant   │ ─────────────► │  Next.js Web (apps)  │
│  Browser    │ ◄───────────── │  UI + API routes     │
└─────────────┘                └──────────┬───────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
             PostgreSQL              Redis/BullMQ         S3 / MinIO
             (Prisma)                (job queues)         (files)
                                          │
                                          ▼
                                   Worker processes
                                   ├─ parse / validate
                                   ├─ transform
                                   ├─ Shopify bulk ops
                                   └─ report generation
                                          │
                                          ▼
                                   Shopify Admin API
                                   (GraphQL + Bulk)
```

---

## 9. Database Architecture

Multi-tenant hierarchy:

```
Organization
  ├── Users / Memberships
  ├── Subscription / Plan / Usage
  └── Stores
        ├── ShopifyConnection (encrypted tokens)
        ├── Jobs → JobRecords / JobErrors
        ├── Files / Templates / FieldMappings
        ├── ScheduledJobs / Backups
        └── AuditLogs / Notifications
```

Rules:
- Every tenant-scoped row carries `organizationId` and usually `storeId`
- UUIDs for public IDs
- Soft-delete where auditability matters
- Encrypted `accessToken` at rest (AES-GCM via `TOKEN_ENCRYPTION_KEY`)

---

## 10. Complete Database Schema (MVP + extension points)

See `packages/db/prisma/schema.prisma` for the executable schema. Conceptual tables:

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant root |
| `users` | App users |
| `memberships` | User ↔ org roles |
| `plans` / `subscriptions` | Billing |
| `usage_records` | Metering |
| `stores` | Shopify shops |
| `shopify_connections` | Encrypted OAuth tokens |
| `jobs` | All async operations |
| `job_records` | Per-row processing state (idempotency) |
| `job_errors` | Row-level errors |
| `files` | Uploaded/generated files |
| `templates` | Import templates |
| `field_mappings` | Saved mappings |
| `transformations` | Phase 2/3 rules |
| `scheduled_jobs` | Cron-like schedules |
| `backups` / `backup_files` | Backup history |
| `audit_logs` | Security / accountability |
| `notifications` | In-app alerts |
| `resource_mappings` | Cross-store ID maps (migration) |

**Job statuses:** `QUEUED` · `VALIDATING` · `PROCESSING` · `COMPLETED` · `PARTIALLY_COMPLETED` · `FAILED` · `CANCELLED`

---

## 11. API Architecture

Hybrid:
- **REST-ish Route Handlers** for CRUD, uploads, job control (simple client UX)
- **Internal service layer** shared by web + workers
- Optional internal GraphQL later for complex dashboard queries

Key route groups:
- `/api/auth/shopify/*` — OAuth install/callback
- `/api/stores/*` — store CRUD / status
- `/api/jobs/*` — list, detail, cancel, retry
- `/api/imports/*` — upload, map, validate, preview, start
- `/api/exports/*` — configure, start, download
- `/api/webhooks/shopify/*` — verified webhooks
- `/api/billing/*` — plans / usage (Phase 2)

All authenticated routes resolve session → membership → store scoping.

---

## 12. Shopify API Architecture

- **API version:** pinned env `SHOPIFY_API_VERSION` (e.g. `2025-01`)
- **Auth:** Offline access token per store; never sent to client
- **Client:** typed GraphQL client with cost-based throttle + retry
- **Webhooks:** `HMAC` verification; `app/uninstalled`, `shop/update`, GDPR topics
- **Scopes (MVP):** `read_products`, `write_products` (+ expand per phase)

---

## 13. Bulk Operation Architecture

**Export**
```
bulkOperationRunQuery → poll → download JSONL → transform → CSV/XLSX → store → notify
```

**Import**
```
parse → validate → transform → JSONL → stagedUploadsCreate → bulkOperationRunMutation
→ poll → parse result JSONL → update job_records → report
```

Respect Shopify concurrency (typically one bulk op per shop) via per-store Redis locks / job serialization.

---

## 14. Import Pipeline

1. Upload to object storage  
2. Detect dataset + columns  
3. Auto-map → user adjust  
4. Validate (schema, types, Shopify constraints, duplicates)  
5. Preview (creates/updates/unchanged/errors)  
6. Confirm → enqueue job  
7. Worker chunks + Shopify bulk mutation  
8. Progress events  
9. Final report + error file  

---

## 15. Export Pipeline

1. Select dataset + fields + filters  
2. Enqueue export job  
3. `bulkOperationRunQuery`  
4. Stream JSONL → format CSV/XLSX/JSON  
5. Upload artifact → download link  

---

## 16. Migration Architecture (Phase 3)

```
Store A → Export → Transform → Validate → Import Store B
```

- Never copy Shopify GIDs across shops  
- Persist `resource_mappings(source_id, destination_id, resource_type, store_pair)`  
- Resolve references (variants, collections, images) via mapping table  

---

## 17. Job / Queue Architecture

Queues (BullMQ):
- `imports`
- `exports`
- `bulk-updates`
- `shopify-bulk-poll`
- `notifications`
- `scheduled` (Phase 2)

Features:
- Progress counters on `jobs`
- Checkpoints / idempotency via `job_records.idempotencyKey`
- Cancellation flags
- Exponential backoff + DLQ
- Per-store concurrency = 1 for Shopify-bound work

---

## 18. File-Processing Architecture

- Stream CSV (never full-buffer huge files)
- XLSX via streaming/chunked libraries; reject pathological sheets early
- Size limits by plan; malware-safe: type sniff, size cap, virus scan hook later
- Path: Browser → signed upload → object storage → worker parser  

---

## 19. Security Architecture

- OAuth state + nonce; CSRF for cookie sessions
- Encrypted tokens at rest; secrets only in env
- Tenant isolation on every query
- Webhook HMAC verification
- Upload validation; rate limiting
- Audit log for sensitive actions
- No tokens / DB creds / internal keys in frontend bundles

---

## 20. Multi-Tenancy Architecture

- Org-scoped authorization middleware
- Store membership checks before job/file access
- Row-level `organizationId` filters in Prisma queries
- Future: RLS policies in Postgres for defense in depth

---

## 21. Billing Architecture

Plans (configurable DB rows, not hard-coded limits in business logic):  
`FREE` · `STARTER` · `GROWTH` · `PRO` · `ENTERPRISE`

Meters: records/month, imports, exports, stores, schedules, retention, seats.

Enforcement: usage service checks before enqueue. Shopify App Billing for App Store distribution.

---

## 22. Frontend Page Structure

```
/                     marketing / install CTA
/app                  dashboard
/app/stores
/app/imports          wizard
/app/exports
/app/jobs
/app/jobs/[id]
/app/bulk-update
/app/templates        (P2)
/app/scheduler        (P2)
/app/backups          (P2)
/app/settings
/app/billing          (P2)
/app/team             (P3)
/app/audit            (P2/P3)
```

---

## 23. Component Architecture

- `layouts/` — app shell, nav
- `dashboard/` — stats, recent jobs
- `import-wizard/` — stepped flow
- `field-mapper/` — column ↔ Shopify field
- `data-preview/` — change summary + sample rows
- `job-progress/` — live progress
- `error-table/` — row errors + download/retry
- `ui/` — design-system primitives (button, table, dialog)

No cards in hero; product UI uses calm SaaS density with clear hierarchy.

---

## 24. Folder Structure

```
/
├── apps/
│   ├── web/                 # Next.js UI + API
│   └── worker/              # BullMQ workers
├── packages/
│   ├── db/                  # Prisma schema + client
│   ├── shared/              # types, errors, constants
│   ├── shopify/             # OAuth, GraphQL, bulk helpers
│   ├── jobs/                # queue definitions, producers
│   └── files/               # parse / map / validate
├── docs/
│   └── ARCHITECTURE.md
├── docker-compose.yml
├── package.json             # pnpm/npm workspaces
└── .env.example
```

---

## 25. Development Roadmap

| Phase | Focus |
|-------|--------|
| 1 | Architecture (this doc) |
| 2 | Database schema + migrations |
| 3 | Shopify OAuth + GraphQL client + webhooks |
| 4 | File engine (CSV/XLSX parse, map, validate) |
| 5 | Job engine (queue, states, progress, retry) |
| 6 | Product import/export E2E |
| 7 | Frontend screens |
| 8 | Load + failure testing |
| 9 | Security review |
| 10 | Production deploy |

---

## 26. Development Complexity

| Area | Complexity | Notes |
|------|------------|-------|
| OAuth + multi-tenant base | Medium | Well-known patterns |
| Bulk ops + polling | High | Concurrency + URL expiry |
| Streaming file engine | High | Memory + XLSX edge cases |
| Idempotent jobs | High | Crash mid-flight |
| Mapping UX | Medium | Critical for adoption |
| Billing + usage | Medium | Shopify Billing quirks |
| Migration | Very high | Relationship graph |

MVP is intentionally narrow (products only) to contain risk.

---

## 27. Biggest Technical Risks

1. Shopify bulk concurrency / throttling per shop  
2. Staged upload + result URL expiry  
3. Memory blowups on large XLSX  
4. Partial failure + idempotent retry correctness  
5. Mapping ambiguity across merchant spreadsheets  
6. Token security / tenant isolation bugs  
7. App Store review + billing compliance  

---

## 28. Scaling Strategy

- Horizontal workers behind Redis  
- Chunked processing + checkpoints  
- Per-shop job serialization for Shopify-bound work  
- Object storage for artifacts (not DB blobs)  
- Partition/archive old `job_records`  
- Target: 10k → 100k → 1M+ records via async design  

---

## 29. Testing Strategy

- **Unit:** mapping, validation, transforms, encryption  
- **Integration:** OAuth mock, Prisma, queue handlers  
- **E2E:** import wizard happy path + failure path  
- **Chaos:** worker crash mid-job, throttle, cancel, expired bulk URLs  
- **Scale fixtures:** 1k / 10k / 100k row files  

---

## 30. Deployment Strategy

- Local: Docker Compose (Postgres, Redis, MinIO)  
- Staging/Prod: containerized `web` + `worker`  
- Migrations on deploy  
- Secrets via platform env  
- Health checks: `/api/health`, worker heartbeat metrics  
- Observability: structured JSON logs, job metrics, Shopify error rates  

---

## Design Decisions (locked for MVP)

1. **Monorepo** with shared packages — one source of truth for types/schema.  
2. **Products-only** for import/export/bulk-update in MVP.  
3. **BullMQ** over custom queues — visibility + retries out of the box.  
4. **Prisma** for velocity + typed queries; raw SQL for heavy reports later if needed.  
5. **ShopData** temporary brand; rename-friendly (config + copy layer).
