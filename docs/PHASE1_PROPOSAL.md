# Phase 1 — Proposal for approval

**Status:** Waiting for owner go-ahead  
**Branch:** `cursor/postpilot-phase1-foundation-633b`

This deliverable is **docs + Prisma schema only**. No auth, UI, or CI implementation yet (per your instruction).

## What to review

1. **Folder structure** — [`docs/FOLDER_STRUCTURE.md`](./FOLDER_STRUCTURE.md) and Section 2 of [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
2. **Prisma schema** — [`packages/db/prisma/schema.prisma`](../packages/db/prisma/schema.prisma)
3. **Decisions** — [`docs/DECISIONS.md`](./DECISIONS.md) (ADRs 001–009)

## Schema coverage (Section 6)

| Spec entity | Model | Notes |
|-------------|--------|------|
| Organization | `Organization` | + white-label fields for Phase 10 |
| User | `User` + Auth.js `Account` / `Session` / `VerificationToken` | |
| Membership(role) | `Membership` | OWNER / ADMIN / EDITOR / CLIENT_APPROVER |
| Workspace | `Workspace` | onboarding progress, timezone, autoApprove, stageConfig |
| BrandProfile | `BrandProfile` | onboarding business fields |
| BrandDNA(versioned) | `BrandDNA` | + optional voice embedding |
| BrandKit | `BrandKit` | colors, fonts, logo → MediaAsset |
| SocialAccount | `SocialAccount` | AES-GCM ciphertext fields |
| AccountSnapshot | `AccountSnapshot` | |
| StageReport | `StageReport` | |
| Competitor | `Competitor` | momentumScore + tier |
| CompetitorSnapshot | `CompetitorSnapshot` | |
| CompetitorPost | `CompetitorPost` | classification + `vector(1536)` |
| NichePlaybook | `NichePlaybook` | versioned |
| ContentPlan | `ContentPlan` | |
| PlannedPost | `PlannedPost` | |
| PostDraft | `PostDraft` | qualityScores JSON + embedding |
| DesignAsset | `DesignAsset` | |
| MediaAsset | `MediaAsset` | |
| Approval | `Approval` | audit-friendly append-only |
| Comment | `Comment` | threaded |
| ScheduledJob | `ScheduledJob` | idempotencyKey |
| PublishedPost | `PublishedPost` | |
| PostMetric | `PostMetric` | H1/H24/H72/D7 |
| WeeklyReport | `WeeklyReport` | |
| CalendarEvent | `CalendarEvent` | |
| Subscription | `Subscription` | Stripe ids |
| CreditLedger | `CreditLedger` | |
| AICallLog | `AICallLog` | |
| AuditLog | `AuditLog` | |

**Extras (pipeline support):** `PipelineRun`, `ApprovalMagicLink`, `FeatureFlag`.

## How to reply

- **Approved** — I will greenfield-scaffold Turborepo/pnpm, replace ShopData packages, implement auth + onboarding + UI shell + CI, then stop again for Phase 1 review.
- **Changes** — send a punch-list (structure and/or schema); I will revise and re-request approval.
