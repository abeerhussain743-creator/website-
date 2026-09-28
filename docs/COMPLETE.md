# PostPilot — system completeness

## Product loop (implemented)

1. Onboard brand + kit  
2. Generate Brand DNA  
3. Discover competitors + niche playbook  
4. Sync account metrics + stage diagnosis  
5. Build 7-day plan  
6. Generate copy + quality scores + designs  
7. Review / magic-link approve  
8. Schedule + dry-run publish  
9. Pull metrics + weekly report  
10. SaaS plan limits (seeded) + admin job/cost views  
11. Platform adapters ready (Instagram primary; others via social package)

## Demo mode

Without Meta/Stripe/LLM keys the system runs fully in **demo/dry-run**:
- Competitor + metrics data is simulated from niche seeds
- Publishing creates `dry_*` platform IDs (never double-posts)
- Design Studio + weekly pipeline produce real PNGs and DB rows

## Live mode (keys)

Set in `.env` when ready:
- `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- Meta / LinkedIn / X / TikTok app credentials
- `STRIPE_*`, `RESEND_API_KEY`
- Real S3/R2 credentials
