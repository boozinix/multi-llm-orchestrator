# Project Context (Tool/Model Agnostic)

This file is a neutral handoff context for any engineering agent, regardless of model, IDE, or CLI environment.

## Project Identity

- **Project name:** Neural Mob
- **Workspace folder:** `Multi LLM talk` (legacy workspace name)
- **Primary app directory:** `neuralmob`
- **Stack:** Next.js (App Router), React, TypeScript, Clerk, Zustand
- **Persistence:**
  - local SQLite for owner/local workflows
  - hosted Postgres for Vercel durability
- **Main goal:** multi-model orchestration product with:
  - quick mode
  - collaborative super mode where later bots improve earlier drafts
  - streaming phase UX
  - local direct-provider or OpenRouter routing
  - hosted OpenRouter-only routing with credit-based billing

## Core Product Behavior

- Users sign in with Clerk.
- Local mode supports provider keys in Settings and an OpenRouter toggle.
- Hosted mode uses server-side OpenRouter plus stored user credits.
- Backend orchestrates one or multiple model calls, then synthesizes them.
- Later model passes in super mode critique and improve earlier drafts.
- Conversations, balances, reservations, and billing events are persisted.

## Primary UX Surfaces

- `src/app/workspace/page.tsx` - main chat UX
- `src/app/workspace/FlowDiagram.tsx` - orchestration diagram
- `src/app/settings/page.tsx` - provider keys, model slots, billing visibility
- `src/app/admin/page.tsx` - owner-only admin dashboard

## Core APIs

- `POST /api/chat`
- `GET/POST /api/conversations`
- `GET/DELETE /api/conversations/[id]`
- `GET /api/usage`
- `GET /api/billing`
- `POST /api/usage/reset`
- `GET /api/showcase`

## Key Server Libraries

- `src/lib/openrouter.ts` - provider routing, model calls, streaming helpers
- `src/lib/server/orchestrator.ts` - non-stream orchestration
- `src/lib/server/orchestrator-stream.ts` - streaming orchestration
- `src/lib/provider-keys.ts` - key resolution and required provider checks
- `src/lib/limits.ts` - usage, starter credit, output cap
- `src/lib/pricing.ts` - model pricing and worst-case credit reservation estimate
- `src/lib/db/*` - dual sqlite/postgres init and query layer

## Security / Runtime Controls

- `src/proxy.ts` protects auth routes and owner-only admin access
- `src/lib/server/request-origin.ts` checks allowed origin
- `src/lib/server/rate-limit.ts` applies in-memory throttling
- `next.config.ts` sets security headers and CSP
- Hosted billing / owner bypass are controlled by env vars

## Environment Notes

- App env template: `neuralmob/.env.example`
- Important hosted vars:
  - `DATABASE_URL`
  - `OPENROUTER_API_KEY`
  - `ALLOWED_ORIGINS`
  - `OWNER_UNLIMITED_EMAILS`
  - `FREE_STARTER_CREDIT_CENTS`
- Important local vars:
  - optional provider API keys
  - optional `OPENROUTER_API_KEY`

## Artifact Inventory

- Generated full dump: `neuralmob/PROJECT_ALL_CODE_FULL.txt`
- Generated source summary: `neuralmob/PROJECT_FULL_SOURCE.md`
- These are secondary artifacts; source files remain canonical.

## Recommended First Steps For An Incoming Agent

1. Read `neuralmob/README.md`.
2. Read `neuralmob/src/app/workspace/page.tsx`.
3. Read `neuralmob/src/lib/server/orchestrator-stream.ts`.
4. Validate:
   - `npm install`
   - `npm run lint`
   - `npm run build`
5. Confirm key flows:
   - Clerk sign-in
   - local OpenRouter toggle behavior
   - quick mode run
   - super mode run
   - hosted credit reservation and deduction
   - owner admin dashboard
6. Treat source as canonical over any generated docs.
