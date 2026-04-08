MultiBot Orchestrator is a Next.js app for orchestrating multiple LLMs (OpenAI, Anthropic, xAI, DeepSeek, Google via OpenRouter, Qwen, Moonshot, Mistral) with a “super” mode that fans out to several models and then merges their answers.

It is designed as **BYOK-only in production**: users paste their own provider keys in the Settings UI; you do **not** need to ship your own model credentials to Vercel.

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

Open [http://localhost:3000](http://localhost:3000) and log in with any valid‑looking email address (demo, no password).

Then go to **Settings → API Keys** and paste your own keys for the providers you want to use.

### 3. Environment variables

Copy `.env.example` to `.env.local` for local dev:

```bash
cp .env.example .env.local
```

Recommended values:

```bash
# UI-only demo deploy (no model calls)
SHOWCASE_MODE=1

# BYOK-only (production default). When 1, server env model keys are ignored;
# only user-pasted keys in Settings are used.
BYOK_ONLY=1

# Comma-separated origins allowed to POST to /api/* in production.
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app

# Optional: server-side model keys for local dev / self-hosting only.
# Leave these UNSET on Vercel if you want strict BYOK-only behavior.
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# XAI_API_KEY=
# DEEPSEEK_API_KEY=
# OPENROUTER_API_KEY=
```

> **Important:** never commit `.env.local`. The repo only includes `.env.example` as a template.

### 4. Running checks

```bash
npm run lint
npm run build
```

## Features

- Quick mode (single model) and Super mode (multi‑model fan‑out + synthesis)
- Streaming UI with phase badges:
  - Bot 1 / Bot 2 / Bot 3
  - Merge 1+2 / Merge (1+2)+3
- Per‑bot and final answer cards, each with **Copy** buttons
- Conversation history sidebar + mobile drawer
- Daily usage counters (runs + API calls) backed by SQLite
- BYOK: user‑provided keys stored in browser local storage (never written to the DB)

## Security & Deployment Notes

### API keys: never in Git; Vercel env only

- **GitHub / the repo** must not contain real secrets. This project ignores `.env`, `.env.local`, and any `.env.*` except `.env.example` (placeholders only). Do not commit `vercel.json` or `next.config` with embedded keys; do not paste keys into issues or PRs.
- **Vercel** stores production secrets in **Project → Settings → Environment Variables** (encrypted). Those values are injected at runtime on the server and are **not** checked into git. End users still do not receive your `OPENROUTER_API_KEY` in the browser bundle—only server routes read `process.env`.
- **Local dev:** keep keys in `.env.local` (gitignored). After `vercel env pull`, treat the downloaded file like `.env.local` and never commit it.

### Runtime behavior (summary)

- **Production:** model calls use the server **`OPENROUTER_API_KEY`** from Vercel env (OpenRouter-only routing). Client-pasted keys are not used for routing in prod.
- **Local dev:** you can use Settings (browser) and/or `.env.local` depending on the “Use OpenRouter” toggle and `BYOK_ONLY`.

### Other safeguards

- Requests are rate‑limited in memory:
  - `/api/auth/login`: 10 requests / 10 minutes / IP
  - `/api/chat`: 20 requests / 5 minutes / (email + IP)
- Middleware enforces:
  - Basic request body size guard via `Content-Length`
  - Origin allow‑list for mutating `/api/*` calls using `ALLOWED_ORIGINS`
  - Cookie‑based email session for all app routes except `/login` and `/api/auth/login`

### Deploy on Vercel

1. Set **Root Directory** to `neuralmob` (or `.` if this repo is only the Next app).
2. In the Vercel dashboard (**Environment Variables**), set at least:
   - `ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app`
   - For real LLM calls: `SHOWCASE_MODE=0` and **`OPENROUTER_API_KEY`** (value entered only here, not in the repo).
   - Optional: `OWNER_UNLIMITED_EMAILS` for a bypass account (emails only, not keys).
   - UI-only demo: `SHOWCASE_MODE=1` and omit `OPENROUTER_API_KEY`.

3. Deploy; visit `/login`, then use the app. No API keys need to exist in the GitHub repo.

> **Note:** Do not log request bodies (they can contain user content). Keep HTTPS enabled and restrict `ALLOWED_ORIGINS` to your real app origins.
