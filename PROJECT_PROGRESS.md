# Project Progress

## Completed In This Session

- Audited the repo for secret exposure.
- Confirmed no live API key values are present in tracked source.
- Added dual database runtime:
  - local SQLite
  - hosted Postgres via `DATABASE_URL`
- Fixed conversation ownership so conversations are user-scoped.
- Added strict hosted credit reservation before runs begin.
- Added reservation release on failure and settlement after completion.
- Switched hosted free tier from one free run to starter credit plus cheap-model restriction.
- Added owner-only admin dashboard at `/admin`.
- Added Stripe top-up backend and settings UI entry point.
- Updated core branding to `Neural Mob`.
- Improved orchestration prompts so later bots critique and improve prior drafts.
- Updated key handoff and environment docs.

## Verified

- `npm run lint` passed
- `npm run build` passed

## Not Yet Live-Tested

- Real Vercel deployment with production env vars
- Real Postgres connection in hosted mode
- Real Stripe checkout + webhook flow
- Full hosted auth/billing/manual QA pass

## Important Files Added Or Updated

- `neuralmob/src/lib/db/*`
- `neuralmob/src/app/api/chat/route.ts`
- `neuralmob/src/app/api/billing/top-up/route.ts`
- `neuralmob/src/app/api/stripe/webhook/route.ts`
- `neuralmob/src/app/admin/page.tsx`
- `neuralmob/src/lib/server/stripe.ts`
- `neuralmob/src/lib/prompts.ts`
- `neuralmob/src/lib/server/orchestrator.ts`
- `neuralmob/src/lib/server/orchestrator-stream.ts`
- `neuralmob/README.md`
- `neuralmob/.env.example`
