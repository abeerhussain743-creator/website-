# PostPilot AI — Architecture Decisions

Format: ADR-lite. Newest first within each phase.

---

## Phase 1 (Foundation) — pending approval

### ADR-001: Greenfield PostPilot in this repository

**Status:** Accepted  
**Context:** The repo currently contains a ShopData (Shopify ops) MVP on branch `cursor/shopdata-mvp-complete-afa8`. PostPilot is a different product with a different package topology (Turborepo + pnpm, `ai` / `social` / `design` / `scraper`).  
**Decision:** Treat PostPilot as a **greenfield replace** of the ShopData tree on a new feature branch. Do not try to share ShopData packages. ShopData history remains on its branch.  
**Consequences:** Clean monorepo matching the product spec; ShopData code is not carried forward on the PostPilot branch.

### ADR-002: Auth.js (Auth.js / NextAuth v5) over Clerk

**Status:** Accepted  
**Context:** Spec allows Auth.js or Clerk. Clerk is a paid third-party SaaS.  
**Decision:** Use **Auth.js** with email magic link + Google OAuth. Organizations/workspaces/roles live in our Postgres schema.  
**Consequences:** More setup for sessions and OAuth callbacks; no Clerk billing dependency; aligns with “ask before adding unpaid-listed paid services.”

### ADR-003: Turborepo + pnpm (replace npm workspaces)

**Status:** Accepted  
**Context:** Spec mandates Turborepo + pnpm. Existing ShopData used npm workspaces.  
**Decision:** Adopt `pnpm-workspace.yaml` + `turbo.json`. Package names `@postpilot/*`.  
**Consequences:** Requires Corepack/`pnpm` in CI and local README.

### ADR-004: Prisma schema includes full product model upfront

**Status:** Proposed  
**Context:** Spec Section 6 lists the full domain; Phase 1 only implements auth, orgs/workspaces, onboarding, brand kit, UI shell.  
**Decision:** Ship the **complete Prisma schema** in Phase 1 (enums + models + indexes + soft deletes), even if later-phase tables are unused until their phase. Use `Unsupported("vector")` / raw SQL migration for pgvector columns where Prisma lacks first-class support.  
**Consequences:** Fewer breaking migrations later; seed only populates Phase 1 entities; unused tables stay empty until wired.

### ADR-005: Workspace as the tenant boundary

**Status:** Proposed  
**Context:** Organizations own many workspaces (brands/clients). Every content/social/AI artifact belongs to a workspace.  
**Decision:** **Workspace ID on every tenant-scoped row.** Membership is org-scoped with an optional workspace scope for Client-Approver. All queries filter by workspace (or org for billing).  
**Consequences:** Row-level isolation is straightforward; agency multi-brand is natural.

### ADR-006: Encrypted token storage shape

**Status:** Proposed  
**Context:** Social OAuth tokens must be encrypted at rest (AES-256-GCM).  
**Decision:** Store `accessTokenEnc`, `refreshTokenEnc`, `tokenIv`, `tokenAuthTag`, `tokenKeyVersion` on `SocialAccount`. App-level encrypt/decrypt in `@postpilot/social` (or shared crypto util); never select plaintext columns.  
**Consequences:** Key rotation via `tokenKeyVersion`; reconnect flow when decrypt/refresh fails.

### ADR-007: Local infra via Docker Compose

**Status:** Proposed  
**Context:** Need Postgres (+ pgvector), Redis, and S3-compatible storage locally.  
**Decision:** `docker compose` services: `postgres` (pgvector image), `redis`, `minio` (R2 stand-in).  
**Consequences:** README stays ≤5 commands for local bring-up.

### ADR-008: Phase gate — structure + schema first

**Status:** Accepted (per product owner prompt)  
**Context:** Owner asked to approve folder structure and Prisma schema before the rest of Phase 1.  
**Decision:** Deliver docs + schema only; pause for review. Do not implement auth/UI/CI until approved.  
**Consequences:** Implementation of Phase 1 continues only after explicit go-ahead.

### ADR-009: Membership uniqueness

**Status:** Proposed  
**Context:** Most members are org-scoped; Client-Approver may be limited to one workspace. Postgres `UNIQUE (org, user, workspace)` treats NULLs as distinct.  
**Decision:** `@@unique([organizationId, userId])` for org membership. If we need multiple workspace-scoped Client-Approver rows per user, add a follow-up migration with a partial unique index on `(organization_id, user_id, workspace_id) WHERE workspace_id IS NOT NULL` and relax the org-wide unique — **default assumption for Phase 1:** one membership row per user per org (role + optional workspace scope).  
**Consequences:** Simple RBAC for Phase 1; agency client portals can still scope via `workspaceId`.

---

### ADR-010: Local disk storage driver for Phase 1

**Status:** Accepted  
**Context:** Docker/MinIO may be unavailable in some agent environments; uploads are still required for brand kit logos.  
**Decision:** `@postpilot/storage` supports `STORAGE_DRIVER=local` (default when S3 keys are empty) served via `GET /media/[...path]`. Docker Compose still documents MinIO for full local parity.  
**Consequences:** Zero-deps local demo; production uses R2/S3.

---

## Phase 1 implementation notes

Phase 1 foundation implemented after schema approval: monorepo, auth, tenancy, onboarding, brand kit, UI shell, CI, worker ping consumer, scraper health stub.

