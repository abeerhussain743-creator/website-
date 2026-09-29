# CURSOR PROMPT — "PostPilot AI": Premium Autonomous Social Media Content System

> Paste this whole file into Cursor (Agent mode), or save it as `docs/PRODUCT_SPEC.md` in the repo and tell Cursor: "Read docs/PRODUCT_SPEC.md and build Phase 1. Stop after each phase for my review."

---

## 0. Your role

You are a senior full-stack architect and product engineer. You are building a **production-grade, premium SaaS** that researches a business's competitors, learns what is working on social media right now, generates a week of high-quality branded posts, gets client approval, and publishes automatically at the best times, adapting its strategy to the account's growth stage.

Rules for how you work:
- Build **phase by phase** (Section 9). At the end of each phase, stop, summarize what was built, list how to run and test it, and wait for my go-ahead.
- Write **typed, modular, tested** code. No placeholder logic, no fake data in production paths, and no `// TODO implement` in delivered features.
- Every external integration (LLM, image model, social API, scraper) sits behind an **interface/adapter** so providers can be swapped.
- Every long-running task runs in a **background job queue**, never inside a request handler.
- Ask me before adding a paid third-party service that is not listed here.
- Keep a `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` updated as you go.

---

## 1. Product vision

A business owner or agency enters business details once. The system then:

1. **Understands the brand**: industry, offer, audience, tone, visual identity.
2. **Discovers competitors**, especially ones **growing fast right now**, not only the biggest.
3. **Reverse-engineers what works**: formats, hooks, topics, posting times, and visual styles that drive engagement in this niche.
4. **Diagnoses the client's own account stage** (new, growing, established, authority) and picks the right content strategy for that stage.
5. **Generates a 7-day content plan** with finished posts: captions, hooks, hashtags, designed images and carousels, and reel/short scripts.
6. **Sends it for approval** (web dashboard, plus a mobile-friendly magic link over email or WhatsApp).
7. **Auto-publishes** approved posts at optimal times.
8. **Learns from results** by pulling post analytics back in and improving next week's plan.

Positioning: "Your AI social media team: strategist, copywriter, designer, and scheduler in one."

---

## 2. Tech stack (use this unless I approve a change)

**Monorepo:** Turborepo + pnpm
```
apps/
  web/        → Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui, Framer Motion
  worker/     → Node.js TypeScript worker (BullMQ consumers + schedulers)
  scraper/    → Python FastAPI microservice (Playwright, httpx) for research/scraping
packages/
  db/         → Prisma schema + client (PostgreSQL)
  ai/         → LLM + image generation adapters, prompt templates, output schemas (Zod)
  social/     → Platform publishing/analytics adapters
  design/     → Branded post rendering engine (templates → PNG/MP4)
  shared/     → Types, constants, utils
```

- **DB:** PostgreSQL (Supabase or Neon) + Prisma, plus **pgvector** for embeddings of posts and brand voice
- **Queue/scheduling:** Redis + BullMQ (delayed jobs for scheduled publishing, repeatable jobs for analytics sync)
- **Auth:** Auth.js (or Clerk): email magic link + Google; organizations/workspaces with roles
- **Storage:** S3-compatible (Cloudflare R2) for media
- **LLM:** Adapter supporting Anthropic Claude (primary, strategy and copy) and OpenAI (fallback). Always use **structured JSON output validated with Zod**.
- **Image generation:** Adapter for fal.ai / Replicate (Flux) for imagery; Ideogram-style model when text-in-image is needed
- **Design rendering:** Satori + resvg (static posts and carousels from JSX templates), Remotion (short animated videos/reels, later phase)
- **Payments:** Stripe (subscriptions + usage credits)
- **Email:** Resend; **WhatsApp approvals:** WhatsApp Cloud API (later phase)
- **Observability:** Sentry, structured logging (pino), job dashboard (Bull Board, admin-only)
- **Testing:** Vitest (unit), Playwright (e2e), pytest (scraper)
- **Deploy targets:** Vercel (web), Railway/Fly.io (worker + scraper + Redis)

---

## 3. Supported platforms

Phase-ordered:
1. **Instagram** (Business/Creator via Meta Graph API): feed images, carousels, reels
2. **Facebook Pages** (Meta Graph API)
3. **LinkedIn** (company pages + personal profiles)
4. **X / Twitter** (API v2)
5. **TikTok** (Content Posting API)

Use **official APIs for publishing and for the client's own analytics**. Handle OAuth, token refresh, token encryption at rest (AES-256-GCM), and a clear "reconnect account" flow when tokens expire. Document app-review requirements (Meta, TikTok) in `docs/PLATFORM_SETUP.md`.

---

## 4. Core modules (the brain)

### 4.1 Business onboarding & Brand DNA
### 4.2 Competitor Intelligence Engine
### 4.3 Account Stage Diagnosis (Growth Stage Engine)
### 4.4 Content Strategy Planner
### 4.5 Content Generation Studio
### 4.6 Design Engine
### 4.7 Approval Workflow
### 4.8 Scheduler & Publisher
### 4.9 Analytics & Learning Loop
### 4.10 Trend Radar (premium add-on)

_(Full module detail lives in the original prompt; implement per build phases in Section 9.)_

---

## 5. SaaS & premium features

- Workspaces under Organizations; agency mode; roles; white-label; Stripe plans + credits; admin panel; AI cost tracking; i18n-ready UI.

---

## 6. Data model (starting point)

`Organization, User, Membership(role), Workspace, BrandProfile, BrandDNA(versioned), BrandKit, SocialAccount(platform, encrypted tokens, status), AccountSnapshot(metrics over time), StageReport, Competitor(momentumScore, tier), CompetitorSnapshot, CompetitorPost(metrics, classification, embedding vector), NichePlaybook(versioned), ContentPlan(week, status), PlannedPost, PostDraft(versioned, qualityScores JSON), DesignAsset, MediaAsset, Approval, Comment, ScheduledJob, PublishedPost(platformPostId), PostMetric(timepoint), WeeklyReport, CalendarEvent, Subscription, CreditLedger, AICallLog, AuditLog`

---

## 7. Weekly automation pipeline

Orchestrated BullMQ flow: refreshCompetitors → analyzeCompetitorPosts → updateNichePlaybook → syncOwnAccountMetrics → diagnoseStage → buildWeeklyPlan → generatePosts → qualityCritic → renderDesigns → notifyForApproval → schedulePublishJobs → publishPost → scheduleMetricPulls → updatePerformance.

---

## 8. UI/UX standards

Linear/Notion-grade aesthetic; light + dark; key screens per original prompt; real-time job progress; mobile-first approval.

---

## 9. Build phases

1. Foundation
2. Brand DNA + LLM layer
3. Competitor Intelligence
4. Social connections + Stage Engine
5. Planner + Content Generation + Quality pipeline
6. Design Engine
7. Approval workflow
8. Scheduler & Publisher
9. Analytics, learning loop, weekly reports
10. SaaS layer (Stripe, agency, white-label, admin)
11. Expansion (LinkedIn, X, TikTok, Remotion, Trend Radar, WhatsApp)

---

## 10. Non-negotiables

Security (encrypted tokens, workspace isolation, rate limits, Zod validation, signed magic links); never publish unapproved content; originality checks; respect ToS; `.env.example`; seed script; README under 5 commands.

**Current status:** Phase 1 — awaiting approval of folder structure + Prisma schema before implementing the rest.
