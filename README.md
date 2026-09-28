# PostPilot AI

Your AI social media team — strategist, copywriter, designer, and scheduler in one.

## Quick start

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev
```

Open http://localhost:3000 → **Enter as demo user** (`demo@postpilot.ai`).

## What works (complete loop)

1. Onboarding + brand kit  
2. Brand DNA generation  
3. Competitor intelligence + niche playbook  
4. Account stage diagnosis  
5. Weekly 7-day plan generation  
6. Copy + quality critic + branded PNG designs  
7. Review board + magic-link approval  
8. Schedule + dry-run publish  
9. Metrics pulls + weekly report  
10. Design Studio (ad-hoc posts)  
11. Admin (jobs / AI cost log)

Without live Meta/Stripe/LLM keys the product runs in **demo/dry-run** with real DB rows and PNGs. Add API keys for live providers.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Web + worker |
| `pnpm db:seed` | Demo workspace (Lumen Café) |
| `pnpm lint` / `typecheck` / `test` | CI |

## Docs

- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/COMPLETE.md`
- `docs/DESIGN_STUDIO.md`
- `docs/DECISIONS.md`
