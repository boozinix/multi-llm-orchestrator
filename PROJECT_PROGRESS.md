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
- Improved orchestration so Bots 1, 2, and 3 answer independently before synthesis/judgment.
- Updated key handoff and environment docs.
- Added a first-run onboarding tour in the workspace.
- Added favicon and social/share metadata assets.
- Added mobile compatibility fixes for auth chrome and onboarding overlays.
- Fixed workspace message/composer spacing so final answers are not hidden behind the composer.

## Verified

- `npm run lint` passed
- `npm run build` passed

## Live Production Status

- `https://neuralmob.xyz` is live.
- The current production build appears to still be on the older deployed UI/auth branch.
- The latest local work is not yet saved/deployed from this session.

## Not Yet Live-Tested

- Real Vercel deployment with production env vars
- Real Postgres connection in hosted mode
- Real Stripe checkout + webhook flow
- Full hosted auth/billing/manual QA pass
- Live domain metadata/share-preview verification
- Hosted abuse/rate-limit behavior under real traffic

## User-Owned Platform Tasks

- Add production env vars in Vercel.
- Point `neuralmob.xyz` and `www.neuralmob.xyz` correctly in Vercel.
- Set up Clerk production keys and OAuth redirect URLs.
- Set up Stripe live keys and webhook for `/api/stripe/webhook`.
- Provide hosted Postgres connection.

## Agent-Owned Remaining Tasks

- Push the current local code changes when the user asks.
- Harden production rate limiting beyond in-memory process state.
- Add Clerk domain hardening for the live deployment.
- Continue UX cleanup based on live testing.
- Prepare and execute the launch smoke-test checklist.

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
- `neuralmob/src/components/workspace-tour.tsx`
- `neuralmob/src/components/auth-chrome.tsx`
- `neuralmob/src/app/icon.svg`
- `neuralmob/src/app/opengraph-image.tsx`
- `neuralmob/src/app/twitter-image.tsx`
- `neuralmob/README.md`
- `neuralmob/.env.example`
