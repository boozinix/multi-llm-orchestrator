# Next Agent Start Here

## Read These First

1. `PROJECT_CONTEXT_AGNOSTIC.md`
2. `PROJECT_RULES.md`
3. `PROJECT_PLAN.md`
4. `PROJECT_PROGRESS.md`
5. `TAKEOVER_AUDIT_TRAIL.md`

## Then Read Key Source Files

1. `neuralmob/README.md`
2. `neuralmob/src/app/workspace/page.tsx`
3. `neuralmob/src/app/settings/page.tsx`
4. `neuralmob/src/app/api/chat/route.ts`
5. `neuralmob/src/lib/db/queries.ts`
6. `neuralmob/src/lib/server/orchestrator-stream.ts`

## Current State

- The app builds and lints successfully.
- The repo is intentionally not yet pushed from this session’s work until the user chooses.
- Hosted mode now assumes:
  - `DATABASE_URL`
  - `OPENROUTER_API_KEY`
  - Clerk config
  - Stripe config
- Local mode still supports owner-friendly usage and provider/OpenRouter flexibility.

## Highest Priority Next Step

Test the real hosted deployment end to end:
- Vercel env vars
- Postgres connectivity
- Clerk auth
- top-up checkout
- Stripe webhook credit application
- hosted chat billing behavior
