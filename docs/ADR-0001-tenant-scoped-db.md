# ADR 0001 — Tenant-scoped Prisma client

## Status

Accepted (Phase 0)

## Context

Maxtrone is multi-tenant. Every institution-owned row carries `institutionId`. A leaked unscoped query would be a critical security failure.

## Decision

1. Application code for tenant features uses `createTenantClient(prisma, institutionId)`.
2. The extension injects `institutionId` into `where` / `data` for all tenant models.
3. Explicit cross-tenant filters or writes throw `TenantScopeError`.
4. Super-admin and auth flows use the unscoped `prisma` client only, and are audited.
5. CI runs `packages/db` tenant isolation Vitest suite and blocks merges on failure.

## Consequences

- Controllers must obtain membership → institutionId before data access.
- New tenant models must be added to `TENANT_MODELS` in `tenant-client.ts`.
- Indexes on `(institutionId, …)` are mandatory for new query patterns (PRD §11).
