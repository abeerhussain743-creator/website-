# PostPilot — system completeness

## Product loop (implemented)

1. Onboard brand + kit  
2. Brand DNA from onboarding **+ website scrape signals** (scraper or direct fetch; demo fallback)  
3. Competitor discovery via scraper fixtures + momentum deltas + niche playbook  
4. Demo OAuth connect (IG/FB/LI/X/TikTok) + encrypted tokens + stage diagnosis  
5. Weekly plan fed by playbook, Brand DNA pillars, and last-week learning  
6. Copy generation via LLM adapters (Anthropic → OpenAI → local) + Design Studio PNGs + carousel slides + Remotion reel stub  
7. Review board, comments, request-changes rewrite, magic-link (email/WhatsApp/console) + white-label approve page  
8. Scheduler + `PUBLISH_DRY_RUN` multi-platform publishers (idempotent `dry_*` IDs)  
9. Metrics pulls + learning loop → provenHooks / playbook / next plan + weekly report  
10. Demo Stripe plan upgrades, credits debit, agency white-label, admin logs  
11. LinkedIn/X/TikTok adapters, Trend Radar UI, Remotion storyboard stub, WhatsApp notify adapter  

## Demo mode

Without Meta/Stripe/LLM keys the system runs fully in **demo/dry-run**:
- Website ingest + competitors come from scraper fixtures or deterministic seeds
- Publishing creates `dry_*` platform IDs (never double-posts); set `PUBLISH_DRY_RUN=false` only with live tokens
- Design Studio + weekly pipeline produce real PNGs and DB rows
- Billing upgrades write Subscription/CreditLedger without calling Stripe

## Live mode (keys)

Set in `.env` when ready:
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- Meta / LinkedIn / X / TikTok app credentials (see `docs/PLATFORM_SETUP.md`)
- `STRIPE_*`, `RESEND_API_KEY`, `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID`
- `FAL_KEY` / `REPLICATE_API_TOKEN` for generative imagery
- Real S3/R2 credentials
- `PUBLISH_DRY_RUN=false` once Graph API publishing is approved
