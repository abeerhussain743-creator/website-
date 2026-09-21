# Maxtrone Campus: Product Requirements Document

> **How to use this file with Cursor:** save it in your repo as `docs/PRD.md`. Build **one phase at a time** (section 14). For each module, tell Cursor: *"Read docs/PRD.md. Build section X. Follow sections 3, 4 and 12 for stack, architecture and quality rules. Write tests for the acceptance criteria."*
>
> "Maxtrone Campus" is a working name. Rename freely.

---

## 1. Product summary

**What it is:** a multi-tenant SaaS for **schools, coaching academies and training centers** in Pakistan. It is **WhatsApp-first** and **Urdu-friendly**, and it helps an institution:

1. **Fill seats.** Every admission inquiry gets an AI reply 24/7, with follow-ups and campus-visit booking.
2. **Collect fees.** Reminders escalate automatically, parents pay in one tap, and defaulters are tracked.
3. **Earn new income.** Parents subscribe to an AI tutor on WhatsApp, and the institution keeps a revenue share.
4. **Stay in control.** The owner gets an 8am briefing, and every month a revenue report shows gains in rupees.

**Positioning:** we don't send notifications, we bring money. Every feature must connect to admissions, fees, retention or new income, and the product must *show* that impact in numbers.

**Who uses it**

| Role | Uses it for | Main surface |
|---|---|---|
| Owner / Director | Growth, money and control | Dashboard, 8am WhatsApp briefing, monthly report |
| Principal / Branch head | Daily operations | Dashboard, attendance, communication |
| Admin / Front office | Admissions, fees and parent queries | Admissions CRM, fees, inbox |
| Accountant | Fees and payments | Fees module |
| Teacher | Attendance, marks and tests | Mobile-first teacher views |
| Parent | Updates, payments and the tutor subscription | **WhatsApp only** (no app to install) + a light web portal via magic link |
| Student | The AI tutor | **WhatsApp only** |
| Maxtrone super-admin | Tenants, plans, usage and costs | Platform admin panel |

**Institution types:** `SCHOOL`, `COACHING_ACADEMY` and `TRAINING_CENTER`. One codebase serves all three. The type sets **default terminology and defaults**, not separate code paths (see 4.4).

---

## 2. Product principles (every feature must follow these)

1. **WhatsApp is the parent's interface.** Parents never need to download an app or create a password.
2. **Urdu first, for parents.** Every parent-facing message supports Urdu, Roman Urdu and English, plus Urdu **voice** where it's useful.
3. **Don't replace their software; plug into it.** Importing from Excel, CSV or Google Sheets must be excellent. The system should be usable with *only* an imported student list.
4. **Every screen answers "so what?"** Dashboards show money and outcomes, not just counts.
5. **Premium and fast.** No action should feel slow. Section 11 covers the design standard.
6. **Automations are visible and controllable.** Every automated message can be previewed, paused and audited.
7. **Configurable, not custom.** A new institution goes live using settings and templates alone, with no code changes.

---

## 3. Tech stack (fixed decisions; Cursor must not change these without asking)

| Layer | Choice |
|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript (strict)** |
| UI | **Tailwind CSS + shadcn/ui + Radix**, **lucide-react** icons, **Framer Motion** (subtle use only) |
| Forms / validation | **react-hook-form + zod** (shared zod schemas for client and server) |
| Data fetching | Server Components by default; **TanStack Query** for interactive client views |
| Tables | **TanStack Table** with server-side pagination, sorting and filtering |
| Charts | **Recharts** |
| Database | **PostgreSQL** (Neon or Supabase) + **Prisma ORM** + **pgvector** (for AI tutor search) |
| Auth | **Better Auth**, using its organizations plugin for multi-tenancy (email + password, Google, and phone OTP for staff) |
| Background jobs | **BullMQ + Redis**, in a separate `worker` process in the same repo |
| Scheduling | BullMQ repeatable jobs (timezone-aware, per tenant) |
| File storage | **Cloudflare R2** (S3-compatible), with presigned uploads |
| WhatsApp | **Meta WhatsApp Cloud API** (direct), behind an internal `MessagingProvider` interface |
| AI (LLM) | Provider-agnostic `AIProvider` interface (Anthropic Claude / OpenAI). Default model set by env var |
| Speech (Urdu voice notes) | Text-to-speech via `TTSProvider` interface (Azure Speech `ur-PK` voices or ElevenLabs) |
| AI voice calls | **Vapi**, behind a `VoiceCallProvider` interface |
| Payments (parents) | **JazzCash** and **Easypaisa** merchant APIs, plus manual bank transfer with proof upload, plus cash entry, behind a `PaymentProvider` interface |
| PDF generation | **@react-pdf/renderer** (receipts, vouchers, reports) |
| Email | **Resend** (staff emails only) |
| Monitoring | **Sentry** (errors) + structured logging (pino) |
| Testing | **Vitest** (unit), **Playwright** (end-to-end), plus a seed script with realistic demo data |
| Hosting | Vercel (web) + Railway or Render (worker + Redis) |

Monorepo layout (pnpm workspaces):

```
/apps/web          Next.js app (dashboard, parent portal, API routes, webhooks)
/apps/worker       BullMQ workers (messaging, AI, schedules, reports)
/packages/db       Prisma schema, client, seed
/packages/core     Domain logic (fees engine, scheduling, scoring) — pure TS, fully unit-tested
/packages/providers  WhatsApp, AI, TTS, voice, payment adapters (interfaces + implementations + mocks)
/packages/ui       Shared design-system components
/docs              PRD.md and ADRs
```

---

## 4. Architecture rules

### 4.1 Multi-tenancy
- Every tenant-owned table has `institutionId` (and `branchId` where relevant).
- **All** database access goes through a tenant-scoped repository or Prisma extension that injects `institutionId` automatically. A query without tenant scope must fail loudly in development.
- There are no cross-tenant joins, except in the super-admin module (which uses a separate, explicitly audited client).
- An end-to-end test must prove that user A of institution 1 cannot read any record of institution 2 through any API route.

### 4.2 Roles and permissions
- Roles: `OWNER`, `PRINCIPAL`, `ADMIN`, `ACCOUNTANT`, `TEACHER`, plus custom roles.
- Permissions are granular strings (e.g. `fees.write`, `admissions.read`, `students.export`). Roles are bundles of permissions, editable by the owner.
- Branch scoping: a user can be limited to specific branches.
- Every mutation checks permissions on the server. Hidden buttons are not security.

### 4.3 Feature entitlements (SaaS plans)
- Plans (`STARTER`, `GROWTH`, `PREMIUM`, `CUSTOM`) map to feature flags plus limits (students, branches, monthly WhatsApp messages, AI tutor seats, voice minutes).
- `hasFeature(institution, "ai_tutor")` and `withinLimit(institution, "voice_minutes")` checks happen server-side, and locked features show a tasteful upgrade card, not an error.
- Super-admin can override any flag or limit per tenant.

### 4.4 Institution type and terminology
Institution type seeds a **terminology map** that the UI reads everywhere (never hardcode these words):

| Key | School | Coaching academy | Training center |
|---|---|---|---|
| `group` | Class | Batch | Course |
| `subgroup` | Section | Group | Cohort |
| `learner` | Student | Student | Trainee |
| `term` | Session | Session | Intake |
| `guardian` | Parent | Parent | Guardian / Self |

The owner can edit these labels in settings. Training centers may have **adult learners with no guardian**, so the learner's own phone becomes the contact.

### 4.5 Events and jobs
- Domain actions emit events (`student.absent`, `invoice.overdue`, `lead.created`, `payment.received`, `test.graded`). Automations subscribe to events. There is no messaging logic inside controllers.
- Every outbound message, AI call, voice call and payment callback runs in a **job** with retries (exponential backoff), an **idempotency key**, and a dead-letter queue visible in the admin UI.
- Webhooks (WhatsApp, payments, Vapi) verify signatures, store the raw payload, then return `200` quickly. Processing happens in a job.

### 4.6 Provider interfaces
Every external service sits behind an interface in `/packages/providers`, with a **mock implementation** used in development and tests. The whole product must run locally with zero external accounts, using the mocks.

---

## 5. Core platform features (Phase 1)

### 5.1 Onboarding wizard (first-run, under 10 minutes to value)
1. Institution name, type, logo, city, branches, academic session dates, timezone (default `Asia/Karachi`), currency (PKR).
2. Classes, batches or courses and sections (with presets per institution type).
3. Import students and guardians (see 5.3), or add them manually.
4. Fee structure (see 7.1).
5. Connect WhatsApp (guided Meta embedded signup), or start in **sandbox mode** using the Maxtrone shared number for testing.
6. Invite staff.
7. Checklist card on the dashboard until setup is complete.

**Acceptance:** a new institution can import 500 students, create fees and send a test WhatsApp message within one sitting. The wizard can be resumed at any step.

### 5.2 Students and guardians (lightweight student records)
- Student: name, photo, roll/registration number, class/batch, section, date of admission, status (`ACTIVE`, `LEFT`, `ALUMNI`, `SUSPENDED`), custom fields.
- Guardian: name, relation, phone (E.164, validated for Pakistan), preferred language (`UR`, `ROMAN_UR`, `EN`), preferred channel (`WHATSAPP_TEXT`, `WHATSAPP_VOICE`, `VOICE_CALL`), WhatsApp opt-in status and timestamp.
- **Siblings are linked automatically** by shared guardian phone. Sibling discounts apply automatically.
- Student profile page as one timeline: attendance, fees, marks, messages sent and received, notes, risk score.
- Bulk actions: promote to the next class, change section, archive, export.

### 5.3 Import engine (must be excellent; it is how most customers start)
- Upload `.xlsx` or `.csv`, or connect a Google Sheet (read-only; optional scheduled re-sync).
- **Smart column mapping:** auto-detect columns (including Urdu or messy headers) with AI assistance, and let the user confirm or fix the mapping.
- Preview with row-level validation: invalid phones, duplicates, missing class. Fix inline or skip.
- Phone normalization: `03xx-xxxxxxx` becomes `+923xxxxxxxxx`.
- Idempotent re-import: match on registration number or on phone plus name.
- **Acceptance:** 2,000 rows import in under 30 seconds (as a background job, with a progress bar), and an error report is downloadable.

### 5.4 Attendance
- Teacher marks a whole class on a phone in **under 20 seconds**: all present by default, tap to mark absent, then submit. Works on slow 3G connections; if offline, it queues the submission and syncs later.
- Also supports staff/teacher attendance.
- Events: `student.absent` triggers a parent alert (configurable delay and cut-off time, e.g. sent at 9:30am only if still marked absent).
- Pattern detection: absent 3+ days in a row, or attendance under X% this month, feeds the risk score (see 9.3).

### 5.5 Settings
- Institution profile, branding (logo and colors for PDFs and the parent portal), terminology, working days, holidays calendar, message quiet hours (default: no automated messages 9pm–8am except replies), languages, staff and roles, integrations, billing plan and usage.

### 5.6 Audit log
- Every create, update, delete, export and bulk message is logged with who did it, what changed (a diff) and when. Owner-only view with filters.

---

## 6. Admissions growth engine (Phase 1; the #1 selling feature)

### 6.1 Lead capture
- Sources: the institution's WhatsApp number, Instagram DMs (phase 2), website form (an embeddable widget and a hosted form page), Facebook lead ads (phase 2), walk-in (manual), and referral links.
- Each lead records: parent name, phone, child name, age or class sought, source, campaign, first message, assigned staff, stage, next follow-up, and notes.
- **Deduplication** by phone. If the number belongs to an existing guardian, the lead is flagged as a **sibling lead**.

### 6.2 Pipeline (Kanban + table)
- Default stages: `New` → `Contacted` → `Visit / Demo booked` → `Visited` → `Test / Assessment` → `Admitted` → `Lost` (with a lost reason).
- Stages are configurable. Drag and drop, bulk move, filters, saved views.
- One click converts an admitted lead into a student and guardian record, with no retyping.

### 6.3 AI admissions agent (WhatsApp)
- Answers incoming inquiries 24/7 in the language the parent uses (Urdu script, Roman Urdu or English), grounded **only** in the institution's **Knowledge Base**: fees, timings, transport, admission process, documents required, test dates, facilities and FAQs. The owner edits the Knowledge Base as simple forms plus free-text FAQ.
- Goal-driven: qualify the lead (class sought, area), then **book a campus visit or demo class** in an available slot from the booking calendar (6.4).
- **Never invents** fees, discounts or promises. If it doesn't know, it says a staff member will reply, and it creates a task.
- **Human handoff:** the parent asks for a person, frustration is detected, or the topic is out of scope. The conversation goes to the shared inbox, and the AI pauses for that chat until staff resume it.
- Every AI reply is logged with the knowledge sources it used. Staff can rate replies to improve the knowledge base.
- **Acceptance:** first reply within 10 seconds (p95). The AI never states a fee that isn't in the knowledge base (verified by automated eval tests with at least 30 sample conversations in Urdu, Roman Urdu and English).

### 6.4 Visit and demo booking
- Slots per branch (days, times, capacity). The AI and staff book into the same calendar.
- Automatic confirmation, a reminder the day before and 2 hours before, a "running late / reschedule" reply flow, and a no-show follow-up.

### 6.5 Follow-up sequences
- A visual sequence builder: steps with delays (e.g. Day 1, 3, 7, 14, 30), message templates, optional Urdu voice note, and stop conditions (replied, booked, admitted, lost, opted out).
- Pre-built templates: "Inquiry, no reply", "Visited, not admitted", "Test given, awaiting decision", "Next-session reactivation".

### 6.6 Referral and sibling engine
- Every parent gets a unique referral link and code. Referred leads are tracked, and the reward (fee discount) applies automatically when the referral is admitted.
- Sibling pipeline: record a student's younger siblings and their expected admission year. The system messages the parent automatically before the admission season.
- Re-activation campaign each new session: send to old leads marked `Lost` for reasons like "timing", and to alumni families.

### 6.7 Admissions analytics
- Funnel: inquiries → contacted → visits → admitted, by source, campaign, staff member and branch.
- Median first-response time (AI vs. human), conversion rate, **lost reasons**, and revenue from new admissions (admissions × annual fee).

---

## 7. Fee management and recovery (Phase 1; the #2 selling feature)

### 7.1 Fee structures
- Fee heads: tuition, admission, exam, transport, lab, other. Frequencies: monthly, quarterly, per term, one-time.
- Assigned per class or batch, overridable per student.
- Discounts: sibling, merit, staff child, scholarship (percentage or fixed), plus late-fee rules (fixed or per day, with a cap).
- **Installment plans** per student.
- All money logic lives in `/packages/core/fees` as pure functions with **100% unit test coverage**. Amounts are stored as integers in **paisa**, never floats.

### 7.2 Invoices and vouchers
- Invoices are auto-generated on schedule (e.g. on the 1st of every month) as a background job.
- A branded PDF voucher and a **payment link** (a short URL to a hosted payment page) for each invoice.
- Bulk print for institutions that still hand out paper vouchers.

### 7.3 Payments
- Channels: JazzCash, Easypaisa (online), bank transfer (parent uploads a screenshot on the payment page or sends it on WhatsApp, then staff approve or reject), and cash or cheque (staff entry).
- Partial payments, advance payments, refunds, and wallet or credit balance.
- An automatic receipt on WhatsApp (PDF plus text) the moment a payment is confirmed.
- **Reconciliation view:** gateway transactions vs. invoices, with unmatched items highlighted.
- Payment callbacks are idempotent: the same callback twice never double-credits (covered by a test).

### 7.4 Recovery automation (escalation ladder)
A configurable ladder per institution. Default:

| Day after due | Action | Channel |
|---|---|---|
| −3 | Friendly heads-up with payment link | WhatsApp text |
| +1 | Reminder with payment link | WhatsApp text (or Urdu voice note, per parent's preference) |
| +5 | Firm reminder, mentions late fee | WhatsApp text |
| +10 | Personal message in the principal's name | WhatsApp text + voice note |
| +15 | AI voice call in Urdu; logs the outcome (promised date, dispute, no answer) | Voice call |
| +20 | Task created for staff to call personally | Internal task |

- The ladder stops the moment the invoice is paid.
- "Promise to pay" dates captured by the AI call pause the ladder until that date.
- **Hardship flow:** the parent replies "installment" and gets offered an installment plan the institution has pre-approved.

### 7.5 Fee dashboard
- Total due, collected this month, outstanding, recovery rate, **amount recovered by automation**, aging buckets (0–30, 31–60, 61–90, 90+ days), and a defaulters list with one-click message or call.

---

## 8. Communication hub (Phase 1–2)

### 8.1 Shared WhatsApp inbox
- One inbox for the institution's number: conversations, assignment to staff, internal notes, labels, quick replies, attachments, and AI draft suggestions.
- Shows linked context beside each chat: the guardian, their children, fees due, and recent attendance.
- Shows whether the WhatsApp **24-hour window** is open or closed. Outside it, only approved templates can be sent, and the UI must enforce this.

### 8.2 Broadcasts and announcements
- Audience builder: by branch, class, section, fee status, attendance, language, or tag.
- Compose once. The system sends **per guardian in their language**, using templates with variables (`{{guardian_name}}`, `{{student_name}}`, `{{amount_due}}`).
- Choose the format: text, image or PDF, **Urdu voice note** (generated from text), or voice call.
- Schedule for later, with a preview for 3 real recipients before sending.
- Delivery tracking per recipient: sent, delivered, read, replied, failed (with the reason).
- The system respects opt-outs and quiet hours, and meters the cost of every broadcast before sending ("This will send 842 messages, estimated cost PKR X").

### 8.3 WhatsApp template manager
- Create message templates, submit them to Meta for approval, and track their status in the app. Includes a library of pre-written templates (Urdu and English) per use case.

### 8.4 Urdu voice notes (Phase 2)
- Text becomes an Urdu or English voice note via the `TTSProvider`. Staff can preview and re-generate before sending.
- **Personalized** per recipient (the student's name, the amount due), generated in a job, cached and reused when the text is identical.
- Guardians with preferred channel `WHATSAPP_VOICE` get a voice note plus a short text version.

### 8.5 AI voice calls (Phase 2)
- Outbound Urdu calls for fee reminders, absence confirmation and event reminders, via `VoiceCallProvider` (Vapi).
- A script with a goal and allowed answers. The call outcome is stored as structured data: `answered`, `promised_date`, `dispute`, `wrong_number`, `callback_requested`, plus a transcript and recording link.
- Calls happen only between 10am and 7pm, with a per-guardian limit (max 1 call per 3 days by default).

### 8.6 AI parent helpdesk (Phase 2)
- The same AI engine as admissions, but for **existing parents**: "What's the homework?", "When is the PTM?", "Is school open tomorrow?", "How much fee is due?" (it verifies the guardian by their phone number and answers only about **their own** children).
- Unanswerable questions go to the inbox with a draft reply.

---

## 9. Owner intelligence

### 9.1 The 8am briefing (Phase 1; the retention feature)
Every day at the owner's chosen time (default 8:00am, working days), one WhatsApp message:

```
Good morning, {{owner_name}}. Here's {{institution_name}} today:
💰 Fees collected yesterday: PKR 185,000 (↑12% vs last week avg)
🙋 Absent today: 23 students, 2 teachers
📥 New admission inquiries: 7 (3 visits booked)
⚠️ Needs attention:
  • Class 8-B: 5 students absent 3+ days in a row
  • 3 complaints pending over 48h
📊 Full dashboard: {{short_link}}
```

- Sections can be switched on or off. Only non-zero or noteworthy items are included, so the message stays short.
- A **per-branch version** goes to each branch head, plus a combined version to the owner.
- The owner can reply with a question ("kitni fee pending hai class 9 ki?") and gets an AI answer from live data (read-only, owner-scoped).
- **Acceptance:** generated in under 5 seconds per tenant. If there is no data (e.g. a holiday), it sends a short holiday note or skips, as configured.

### 9.2 Dashboard (web)
- Top: the money KPIs (collected this month, outstanding, new admissions revenue, tutor income).
- Then: an admissions funnel, fee recovery trend, attendance trend, at-risk students, and pending tasks.
- Every KPI is clickable and opens the filtered list behind it.

### 9.3 Withdrawal early-warning (risk score) (Phase 2)
- A daily job scores each active student from 0 to 100 using explainable rules: attendance drop, consecutive absences, overdue fees, falling marks, negative feedback or complaints, and sibling left.
- **Show the reasons**, not just the score ("Attendance down 30% this month · 2 invoices overdue").
- High-risk alerts go to the principal, with a suggested action (call the parent, or schedule a meeting).

### 9.4 Monthly ROI report (Phase 2)
- On the 1st of every month, a branded PDF plus a WhatsApp summary to the owner covering: inquiries answered, first-response time, visits booked, admissions won (and their annual fee value), fees recovered by automation, tutor income earned, messages sent and read rate, and at-risk students saved.
- The headline is always a rupee figure: **"Maxtrone helped you gain or save PKR X this month."**
- Attribution rules are documented in code (e.g. a fee counts as "recovered by automation" if it was paid within 72 hours of an automated reminder).

---

## 10. Academics and AI tutor

### 10.1 Tests, marks and results (Phase 2)
- Create a test (subject, class or batch, total marks, date), enter marks in a fast spreadsheet-style grid (keyboard navigation, paste from Excel), then publish.
- Parents get results on WhatsApp with the student's marks, **class rank** (optional), and **weak topics** (if the test has a topic tag per question).
- Report cards as PDFs, with branded templates per institution.

### 10.2 Phone-photo MCQ checking (Phase 2; strong for academies)
- The institution prints **Maxtrone OMR answer sheets**, generated by the app as a PDF, with a QR code encoding the test ID, a student-ID bubble grid, and corner alignment markers.
- The teacher sends photos of sheets on WhatsApp or uploads them in bulk on the web. The worker detects the corners, corrects the perspective, reads the bubbles, and matches the QR code to the test and student.
- Low-confidence reads are sent to a **review screen** where the teacher confirms or fixes them in one tap. Nothing low-confidence is published automatically.
- Results flow into 10.1 (ranking, weak topics, parent messages).
- **Acceptance:** at least 99% bubble accuracy on clear photos, under 5 seconds per sheet, and every uncertain sheet is flagged for review.

### 10.3 Weekly AI progress notes (Phase 2)
- Each Friday, each parent gets a short personalized update (4–6 lines) written by AI from real data only: attendance, marks and teacher remarks. It's sent in their language, as text or a voice note.
- The teacher or principal can review and approve a batch before it's sent (optional setting).

### 10.4 AI tutor on WhatsApp (Phase 3; the new-income feature)
**What it does:** students message a WhatsApp number with homework questions and doubts, and get step-by-step explanations grounded in the **institution's syllabus and books** (Sindh Board, Federal Board, Punjab Board, Cambridge O/A Level, MDCAT/ECAT and similar).

**Content ingestion**
- Admin uploads textbooks, notes and past papers as PDFs (or picks from a shared Maxtrone library by board and grade).
- The worker extracts the text (with OCR for scanned PDFs), chunks it by chapter and topic, creates embeddings, and stores them in pgvector with metadata (board, grade, subject, chapter).

**Tutoring behavior**
- Identifies the student by their registered phone number, and knows their grade and subjects.
- Answers with the **Socratic method by default**: explain concepts and steps, and don't just hand over final answers to assignment questions.
- Accepts a **photo of the question** (vision) and voice notes (speech-to-text).
- Replies in the student's language. Maths is formatted readably for WhatsApp.
- Cites the chapter or page used when relevant.

**Safety (mandatory, since users are minors)**
- Answers study topics only. Anything off-topic gets a polite redirect.
- A strict system prompt plus a moderation pass on both input and output. There is no personal-information collection, no romantic or inappropriate content, and no advice on dangerous topics.
- **Distress detection:** if a student expresses self-harm, abuse or serious distress, the tutor responds with care, stops tutoring, and alerts the institution's designated safeguarding contact immediately.
- Parents get a **weekly summary** of topics asked about. Full conversation logs are visible to the institution's authorized staff.
- Parent consent is recorded before a student is activated.

**Monetization**
- The institution sets the parent price (e.g. PKR 500–1,000 a month) and bundles. Parents subscribe through the same payment links.
- A revenue-share ledger per institution: gross, platform share, institution share, and monthly payout statements.
- Usage limits per student (e.g. daily message cap), with **cost metering per tenant** (AI tokens, WhatsApp conversations).

**Acceptance:** first response within 15 seconds (p95). Off-topic and safety evals pass on a test set of at least 50 prompts. Answers for syllabus questions cite a retrieved source at least 90% of the time.

---

## 11. Premium UX and design system

The product must feel like **Linear, Stripe Dashboard or Notion** in quality: calm, fast and confident.

**Visual language** (matches the Maxtrone sales deck)
- Colors: Ink `#0E1B2C` (primary dark), Ivory `#F6F3EC` (warm background), Card `#FFFDF8`, Gold `#C9A24A` (accent, used sparingly: primary highlights and key numbers), Gold-dark `#8A6A1F` (accent text on light), Body text `#3D4757`, Border `#E4DDCC`, Danger `#B42318`, Success `#127A4B`.
- Typography: **Fraunces** for display headings and big numbers, **DM Sans** for the UI. Use tabular numbers for all money and statistics.
- Full **dark mode** built on the Ink palette.
- Radius 12–16px, soft layered shadows, 8px spacing grid, generous whitespace.
- Urdu text is rendered in **Noto Nastaliq Urdu**, right-to-left, wherever Urdu content is previewed.

**Interaction standards**
- **Command palette (⌘K / Ctrl+K):** search students, guardians, leads and invoices, and jump to any page or action.
- Keyboard shortcuts for frequent actions (new lead, mark attendance, record payment).
- **Skeleton loaders**, never blank screens or spinners on full pages.
- **Optimistic updates** for status changes (lead stage, attendance, payment approval), with rollback on error.
- Toasts with an **undo** option for destructive or bulk actions.
- Every list has an empty state that explains what to do next and offers one clear action.
- Money is always formatted as `PKR 1,85,000` (Pakistani grouping, configurable), and dates as `22 Sep 2026`.
- Fully responsive. Teacher and front-office screens are designed **mobile-first**.
- Accessibility: WCAG AA contrast, visible focus rings, labels on every input, and keyboard navigation everywhere.
- Motion: 150–250ms ease-out, no bouncing, and it respects `prefers-reduced-motion`.

**Performance budgets**
- Largest Contentful Paint under 2.0s on a mid-range Android phone over 4G.
- API p95 under 300ms for reads and under 500ms for writes (excluding external calls, which always run in jobs).
- Lists paginate on the server (cursor-based). Nothing loads more than 100 rows at once.
- Database indexes on every `institutionId` + frequently-filtered column combination. Cursor must add indexes along with each new query pattern.

---

## 12. Quality, security and compliance rules

1. **Tenant isolation test suite** runs in CI and blocks merges on failure.
2. Money in integer paisa. Fee engine has 100% unit coverage.
3. All webhooks verify signatures, are idempotent and store raw payloads.
4. Secrets only in environment variables, validated at startup with zod (`env.ts`).
5. Personal data: guardian phone numbers and student data are encrypted at rest (database-level), and **exports are permission-gated and audit-logged**.
6. Messaging compliance: WhatsApp opt-in recorded per guardian, one-tap opt-out ("STOP" / "بند کریں") honored instantly, quiet hours enforced, and templates only outside the 24-hour window.
7. Rate limiting on public endpoints (forms, payment pages, webhooks) and per-tenant message throughput limits.
8. Every AI feature has: a system prompt in version control, an eval test set in `/packages/core/evals`, logging of inputs and outputs (with personal data redacted in logs), and a kill switch per tenant.
9. Backups: daily automated database backups, with a tested restore procedure documented in `/docs`.
10. Each module ships with seed data, unit tests for logic, and a Playwright test for its main flow.

---

## 13. Maxtrone super-admin (Phase 1 basic, grows later)
- A list of tenants with plan, status, student count, and last activity.
- Impersonate a tenant (read-only by default, audited) for support.
- Plans and entitlements editor, and per-tenant overrides.
- **Usage and cost metering:** WhatsApp conversations, AI tokens, TTS characters and voice minutes per tenant per month, compared against what the tenant pays, to show margin per tenant.
- Global message template library, and a shared syllabus library for the AI tutor.
- Invoicing for your SaaS subscriptions: generate PKR invoices and record manual payments (Stripe isn't available in Pakistan; add a payment gateway later).

---

## 14. Build phases (give Cursor one phase at a time)

**Phase 0: Foundation (week 1–2)**
Monorepo, stack setup, design system and app shell (sidebar, top bar, ⌘K palette, dark mode), auth + organizations + roles, tenant-scoped database layer + isolation tests, provider interfaces with mocks, BullMQ worker, seed data, CI.

**Phase 1: Sellable MVP (week 3–8)**
Onboarding wizard, students/guardians + import engine, attendance + absent alerts, admissions CRM + AI admissions agent + booking + follow-up sequences, fee structures + invoices + payments + recovery ladder (text channel only), shared WhatsApp inbox, broadcasts + templates, **8am briefing**, dashboard, basic super-admin, plans and entitlements.

**Phase 2: Differentiators (week 9–14)**
Urdu voice notes, AI voice calls (fees + absence), AI parent helpdesk, tests + marks + results, **phone-photo MCQ checking**, weekly AI progress notes, risk score, **monthly ROI report**, referral engine, Instagram DMs.

**Phase 3: New income + expansion (week 15+)**
AI tutor (ingestion, tutoring, safety, subscriptions, revenue share), parent feedback surveys per teacher, competitor watch (tracks nearby institutions' fees, batches and ads), transport tracking (driver phone location + "van is 5 minutes away" alerts), parent web portal enhancements.

---

## 15. Core data model (starting point for the Prisma schema)

`Institution`, `Branch`, `User`, `Membership` (user ↔ institution + role + branch scope), `Role`, `Plan`, `Entitlement`, `TerminologyMap`
`AcademicSession`, `Group` (class/batch/course), `Subgroup` (section), `Subject`
`Student`, `Guardian`, `StudentGuardian`, `Enrollment`, `StudentStatusHistory`
`AttendanceSession`, `AttendanceRecord`, `StaffAttendance`
`Lead`, `LeadStage`, `LeadActivity`, `LeadSource`, `Referral`, `SiblingProspect`, `BookingSlot`, `Booking`
`FeeHead`, `FeeStructure`, `FeeAssignment`, `Discount`, `InstallmentPlan`, `Invoice`, `InvoiceLine`, `Payment`, `PaymentAllocation`, `Refund`, `LateFeeRule`, `RecoveryLadder`, `RecoveryStep`, `RecoveryRun`
`Conversation`, `Message`, `MessageTemplate`, `Broadcast`, `BroadcastRecipient`, `Sequence`, `SequenceStep`, `SequenceEnrollment`, `VoiceNote`, `VoiceCall`, `OptInRecord`
`KnowledgeBaseEntry`, `AIInteraction` (prompt version, sources, latency, cost, rating)
`Test`, `TestQuestion` (topic tags), `Mark`, `OMRSheet`, `OMRScan`, `ReportCard`, `ProgressNote`
`TutorEnrollment`, `TutorSubscription`, `TutorSession`, `TutorMessage`, `SyllabusDocument`, `SyllabusChunk` (vector), `RevenueShareLedger`, `SafeguardingAlert`
`RiskScore`, `Briefing`, `MonthlyReport`, `Task`, `Survey`, `SurveyResponse`
`AuditLog`, `UsageMeter`, `WebhookEvent`, `JobFailure`

Common fields on all tenant tables: `id` (cuid), `institutionId`, `createdAt`, `updatedAt`, `deletedAt` (soft delete where it makes sense).

---

## 16. Definition of done (for every feature)
- [ ] Works for all three institution types, using terminology labels.
- [ ] Permission checks on the server, plus tenant isolation covered by tests.
- [ ] Loading, empty, error and success states designed. Mobile layout checked.
- [ ] External calls run in jobs with retries and idempotency.
- [ ] Messages respect opt-in, opt-out, quiet hours and the 24-hour window.
- [ ] Unit tests for logic, one Playwright happy-path test.
- [ ] Seed data updated so the feature looks real in a demo.
- [ ] Audit log entries for important changes.
