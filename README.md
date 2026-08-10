# DealFlow AI

**Turn every sales call into a ready-to-send proposal.**

Full-stack MERN SaaS that uploads sales calls, extracts requirements with AI confidence scores, generates editable proposals with smart pricing, and tracks client opens → accepts.

## Stack

- **React** + Vite + Tailwind CSS + Framer Motion
- **Node.js** + Express
- **MongoDB** + Mongoose (in-memory fallback for local demos)
- **OpenAI** (mock analysis when no API key)
- **JWT** auth + organization multi-tenancy
- **PDFKit** proposal export
- **Stripe** billing (demo upgrade without keys)

## Product workflow

```text
Sales Call → Upload → AI Analysis → Requirements → Proposal → Edit → Send → Track → Accept
```

### Highlights

- SaaS dashboard (pipeline value, conversion, recent calls)
- Upload recording / transcript / paste / simulated meeting import
- AI extraction: requirements, pain points, budget, timeline, decision maker, urgency
- Confidence scores + inferred warnings
- Missing-information gate with AI clarifying questions
- Smart pricing packages (Starter / Professional / Enterprise)
- Proposal editor + templates (Modern, Corporate, Creative, Technical)
- Public client proposal page (no account required)
- Proposal tracking timeline (opened, viewed pricing, returned, accepted)
- AI follow-up generator (friendly / professional / direct)
- PDF download + email preview on send

## Quick start

```bash
npm install
npm install --prefix server
npm install --prefix client

cp server/.env.example server/.env

npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:5000  

### Demo login

| Email | Password | Role |
|-------|----------|------|
| `alex@dealflow.ai` | `demo1234` | Owner |
| `sam@dealflow.ai` | `demo1234` | Member |

Invite code: `dealflow`

### Portfolio demo path

1. Log in as Alex  
2. Open **Acme Digital** call → review AI analysis + confidence  
3. Or **Upload Call** with the Harbor & Co e-commerce transcript  
4. Click **Generate Proposal** → edit pricing → **Send**  
5. Open the public `/p/:slug` page → **Accept Proposal**  
6. Dashboard updates with the won deal  

## Environment

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Persistent MongoDB (empty → in-memory) |
| `JWT_SECRET` | JWT signing secret |
| `OPENAI_API_KEY` | Real AI extraction (optional) |
| `STRIPE_SECRET_KEY` | Live billing (optional) |
| `CLIENT_URL` | Public proposal / CORS origin |
| `SEED_ON_BOOT` | Seed demo data on boot (`true` by default) |

## Project structure

```text
client/   React SPA (dashboard, editor, public proposal page)
server/   Express API, AI service, seed data, PDF export
```

## Positioning

> I build AI-powered SaaS products using MERN, from idea to production.
