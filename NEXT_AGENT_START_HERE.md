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
- `neuralmob.xyz` is already live, but current production is behind the latest local changes.
- There is meaningful uncommitted local work in `neuralmob` that includes:
  - mobile UX fixes
  - workspace tour improvements
  - favicon/share metadata updates
  - orchestration prompt/flow updates
  - message/composer cutoff fix
- Hosted mode now assumes:
  - `DATABASE_URL`
  - `OPENROUTER_API_KEY`
  - Clerk config
  - Stripe config
- Local mode still supports owner-friendly usage and provider/OpenRouter flexibility.

## Highest Priority Next Step

Bring production to parity with the latest local code, then test the real hosted deployment end to end:
- save/commit local work only when the user approves
- Vercel env vars
- Postgres connectivity
- Clerk auth
- top-up checkout
- Stripe webhook credit application
- hosted chat billing behavior
