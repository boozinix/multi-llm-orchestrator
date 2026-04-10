# Full Detailed Plan + Progress + Remaining Work

## Objective

Enable a clean handoff so any incoming AI/tool can continue development and operations on Neural Mob without losing context.

## Detailed Plan (End-to-End)

### Phase A - Baseline and Environment

1. Confirm workspace root and app root (`neuralmob`).
2. Install dependencies and verify local startup.
3. Verify env configuration for local and hosted modes.
4. Validate Clerk auth and origin restrictions.

### Phase B - Functional Validation

1. Validate auth flow.
2. Validate settings flow:
   - local provider key save/discard
   - local OpenRouter toggle behavior
   - model slot assignment
   - billing / usage visibility
3. Validate workspace flow:
   - quick mode run
   - collaborative super mode run
   - stream phase rendering
   - error states and settings redirection
4. Validate conversation flow:
   - create, fetch, select, delete conversation

### Phase C - Orchestration Reliability

1. Review collaborative bot logic in non-stream and stream orchestrators.
2. Verify timeout handling and degraded-mode behavior.
3. Verify provider routing and fallback logic.
4. Verify client-safe error boundaries.

### Phase D - Security and Guardrails

1. Confirm auth protection and body-size checks.
2. Confirm origin allowlist behavior.
3. Confirm rate limiting behavior for auth/chat.
4. Confirm CSP and headers in `next.config.ts`.
5. Confirm hosted OpenRouter-only behavior in production.

### Phase E - Data and Usage Integrity

1. Verify local SQLite and hosted Postgres initialization paths.
2. Verify strict credit reservation and release/settlement atomics.
3. Verify UI counters align with usage/billing endpoints.
4. Validate reset usage helper only in intended dev contexts.

### Phase F - Admin and Billing Ops

1. Add owner-only admin visibility.
2. Add top-up/payment flow.
3. Add owner admin actions for credit/tier management.

## Progress Completed

- Verified the live app path is `neuralmob`, not the stale `multibot-orchestrator` path in older generated docs.
- Audited the repo for secret exposure; no live API key values were found in tracked source.
- Implemented dual database runtime:
  - local SQLite
  - hosted Postgres via `DATABASE_URL`
- Implemented strict credit reservation before hosted runs start.
- Switched hosted free tier from one-run gating to starter credit plus cheap-model restriction.
- Added owner-only `/admin` dashboard for users, balances, reservations, and spend.
- Updated core branding to `Neural Mob`.
- Improved orchestration so Bots 1, 2, and 3 answer independently, then merge/judge in explicit stages.
- Enforced merge-step dependency rules so invalid flow chains cannot be enabled in the UI.
- Added first-run guided onboarding in the workspace.
- Added favicon/share-preview assets for production identity.
- Added mobile compatibility fixes for auth chrome and onboarding overlays.
- Fixed workspace message padding so final answers are not hidden behind the composer.
- Verified `npm run lint` and `npm run build` after the refactors.

## Current Production Snapshot

- `neuralmob.xyz` is live.
- The current production deployment is still behind the latest local work.
- The screenshots indicate production still shows older branding/layout elements and does not yet reflect the most recent local UX fixes.
- The next deploy should happen only after:
  1. the current local work is saved,
  2. Vercel production env vars are confirmed,
  3. a live QA pass is ready.

## Remaining Work

### High Priority

1. Save and deploy the latest local fixes to production after user approval.
2. Validate production env configuration in Vercel:
   - `DATABASE_URL`
   - `OPENROUTER_API_KEY`
   - Clerk production keys
   - Stripe live keys
   - `NEXT_PUBLIC_APP_URL`
   - `ALLOWED_ORIGINS`
3. Run live hosted QA:
   - sign-in
   - free starter credit
   - model restrictions
   - top-up
   - webhook crediting
   - chat billing behavior
4. Add owner admin actions:
   - manual credit grants
   - tier changes
   - search/filter/export
5. Replace in-memory rate limiting with a production-safe hosted strategy.
6. Add Clerk production-domain hardening and verify allowed origins/redirects.
7. Add hosted deployment checklist and smoke-test script.

### Medium Priority

1. Add automated script for reproducible full-code export.
2. Add CI checks for lint/build/test baseline.
3. Add deeper orchestration evaluation prompts/tests.

### Optional

1. Architecture diagrams.
2. Endpoint contract docs.
3. Incident runbook for auth, OpenRouter, and billing failures.

## Current Completion Estimate

- **Production foundation:** substantially complete
- **Strict metering core:** complete
- **Owner admin visibility:** complete
- **Payments / top-up backend:** implemented in code, not fully live-validated
- **Production deployment:** partially complete, needs real env + QA pass
- **Mobile / responsive UX fixes:** implemented locally, not yet deployed
- **Docs / generated artifact cleanup:** improved but should still be rechecked before final handoff

## Immediate Next Action Recommendation

Incoming agent should first:
1. read `PROJECT_CONTEXT_AGNOSTIC.md`,
2. read `TAKEOVER_RULES.md`,
3. treat `neuralmob` source as canonical over stale generated docs,
4. validate local and hosted env assumptions,
5. compare local uncommitted work against the live deployment,
6. then finish production deployment hardening and live QA.
