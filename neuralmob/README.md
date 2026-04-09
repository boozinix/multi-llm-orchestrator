Neural Mob is a Next.js app for multi-model orchestration with quick mode, collaborative super mode, streaming synthesis, Clerk auth, and credit-based billing.

It is designed to support two modes:
- Local owner mode: unlimited for you, with a Settings toggle to route everything through OpenRouter or call providers directly with their own keys.
- Hosted Vercel mode: users sign in with Clerk, all model traffic goes through your server-side OpenRouter key, free users get starter credit plus cheap models only, and paid users spend prepaid credit.

## Getting Started

### 1. Install dependencies

```bash
cd neuralmob
npm install
```

### 2. Local development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and then go to **Settings**.

Local behavior:
- Turn **Use OpenRouter** on to route every model call through OpenRouter.
- Turn it off to use each provider’s own API key directly.
- If your email is in `OWNER_UNLIMITED_EMAILS`, billing gates are bypassed for that account.

### 3. Environment variables

Copy `.env.example` to `.env.local` for local dev:

```bash
cp .env.example .env.local
```

Recommended values:

```bash
# UI-only demo deploy (no model calls)
SHOWCASE_MODE=1

# Durable hosted database for Vercel / production billing.
# DATABASE_URL=postgres://...

# Comma-separated origins allowed to POST to /api/* in production.
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app

# Optional: server-side model keys for local dev / self-hosting only.
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# XAI_API_KEY=
# DEEPSEEK_API_KEY=
# OPENROUTER_API_KEY=

# Hosted credit settings
# FREE_STARTER_CREDIT_CENTS=50
# MODEL_MAX_OUTPUT_TOKENS=2048
# RUN_COST_SAFETY_MULTIPLIER=1.35
```

> **Important:** never commit `.env.local`. The repo only includes `.env.example` as a template.

### 4. Running checks

```bash
npm run lint
npm run build
```

## Features

- Quick mode (single model) and Super mode (collaborative multi-model reasoning + synthesis)
- Streaming UI with phase badges:
  - Bot 1 / Bot 2 / Bot 3
  - Merge 1+2 / Merge (1+2)+3
- Per‑bot and final answer cards, each with **Copy** buttons
- Conversation history sidebar + mobile drawer
- Local daily usage counters (runs + API calls)
- Durable Postgres storage for hosted users, conversations, credit balances, reservations, and billing events
- Strict run reservation so hosted users cannot start a run that exceeds available credit
- Owner-only admin dashboard at `/admin`
- Stripe checkout top-ups via `/api/billing/top-up` and `/api/stripe/webhook`
- BYOK: local user-provided keys stay in browser local storage (never written to the DB)

## Security & Deployment Notes

### API keys: never in Git; Vercel env only

- **GitHub / the repo** must not contain real secrets. This project ignores `.env`, `.env.local`, and any `.env.*` except `.env.example` (placeholders only). Do not commit `vercel.json` or `next.config` with embedded keys; do not paste keys into issues or PRs.
- **Vercel** stores production secrets in **Project → Settings → Environment Variables** (encrypted). Those values are injected at runtime on the server and are **not** checked into git. End users still do not receive your `OPENROUTER_API_KEY` in the browser bundle—only server routes read `process.env`.
- **Local dev:** keep keys in `.env.local` (gitignored). After `vercel env pull`, treat the downloaded file like `.env.local` and never commit it.

### Runtime behavior (summary)

- **Production / Vercel:** model calls use the server **`OPENROUTER_API_KEY`** plus durable **`DATABASE_URL`** storage. Client-pasted keys are not used for hosted routing.
- **Local dev:** you can use Settings (browser) and/or `.env.local` depending on the “Use OpenRouter” toggle and `BYOK_ONLY`.

### Other safeguards

- Requests are rate‑limited in memory:
  - `/api/auth/login`: 10 requests / 10 minutes / IP
  - `/api/chat`: 20 requests / 5 minutes / (email + IP)
- Middleware / proxy enforce:
  - Protected app routes with Clerk
  - Basic request body size guard via `Content-Length`
  - Origin allow‑list for mutating `/api/*` calls using `ALLOWED_ORIGINS`
  - Owner-only access to `/admin`

### Deploy on Vercel

1. Set **Root Directory** to `neuralmob` (or `.` if this repo is only the Next app).
2. In the Vercel dashboard (**Environment Variables**), set at least:
   - `DATABASE_URL=...`
   - `ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app`
   - For real LLM calls: `SHOWCASE_MODE=0` and **`OPENROUTER_API_KEY`** (value entered only here, not in the repo).
   - Stripe payments: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`
   - Optional billing tuning: `FREE_STARTER_CREDIT_CENTS`, `MODEL_MAX_OUTPUT_TOKENS`, `RUN_COST_SAFETY_MULTIPLIER`
   - Optional: `OWNER_UNLIMITED_EMAILS` for a bypass account (emails only, not keys).
   - UI-only demo: `SHOWCASE_MODE=1` and omit `OPENROUTER_API_KEY`.

3. Deploy; visit `/login`, then use the app. No API keys need to exist in the GitHub repo.

> **Note:** Do not log request bodies (they can contain user content). Keep HTTPS enabled and restrict `ALLOWED_ORIGINS` to your real app origins.
