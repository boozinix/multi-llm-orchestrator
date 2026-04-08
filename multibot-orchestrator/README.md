MultiBot Orchestrator is a Next.js app for orchestrating multiple LLMs (OpenAI, Anthropic, xAI, DeepSeek, Google via OpenRouter, Qwen, Moonshot, Mistral) with a “super” mode that fans out to several models and then merges their answers.

It is designed as **BYOK-only in production**: users paste their own provider keys in the Settings UI; you do **not** need to ship your own model credentials to Vercel.

## Getting Started

### 1. Install dependencies

```bash
cd multibot-orchestrator
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

This project is intended to run as a **BYOK** front‑end on Vercel:

- In production (`NODE_ENV=production`) and/or when `BYOK_ONLY=1`, server‑side env model keys are **ignored**.
- Each user pastes their own keys in Settings; these are sent to `/api/chat` only when issuing a run.
- Requests are rate‑limited in memory:
  - `/api/auth/login`: 10 requests / 10 minutes / IP
  - `/api/chat`: 20 requests / 5 minutes / (email + IP)
- Middleware enforces:
  - Basic request body size guard via `Content-Length`
  - Origin allow‑list for mutating `/api/*` calls using `ALLOWED_ORIGINS`
  - Cookie‑based email session for all app routes except `/login` and `/api/auth/login`

### Deploy on Vercel

1. Set **Root Directory** to `multibot-orchestrator`.
2. Configure env vars in the Vercel dashboard:

   - `BYOK_ONLY=1`
   - `ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app`
   - Optionally `SHOWCASE_MODE=1` for a UI‑only demo (no model calls).

3. Deploy; then:
   - Visit `/login` and enter an email.
   - Go to **Settings → API Keys**.
   - Paste your own OpenAI / Anthropic / xAI / DeepSeek / OpenRouter keys.

> **Note:** Even though BYOK means you are not shipping your own credentials, you should still treat user keys as sensitive:
> do not log request bodies, keep HTTPS enabled, and restrict `ALLOWED_ORIGINS` to trusted front‑end domains.
