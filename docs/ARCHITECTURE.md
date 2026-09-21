# Architecture overview

See [PRD.md](./PRD.md) for product requirements.

## Phase 0 layout

```
apps/web           Next.js 15 App Router (dashboard shell, auth, APIs)
apps/worker        BullMQ workers (messaging + schedules heartbeat)
packages/db        Prisma + tenant-scoped client + seed
packages/core      Permissions, terminology, entitlements, fees (paisa), env
packages/providers Messaging / AI / TTS / voice / payment interfaces + mocks
packages/ui        Design system (Ink / Ivory / Gold, Fraunces + DM Sans)
```

## Auth & tenancy

- **Better Auth** handles staff email/password sessions (`/api/auth/[...all]`).
- **Institution** is the tenant. `Membership` + `Role.permissions` authorize access.
- Data access for tenant features goes through `createTenantClient` (ADR 0001).

## Jobs

Outbound messaging and future AI/payment work runs in `apps/worker` with retries and `JobFailure` dead-letter rows.
