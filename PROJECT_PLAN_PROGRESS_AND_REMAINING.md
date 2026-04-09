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
- Improved super-mode prompts so later bots critique and improve earlier drafts.
- Verified `npm run lint` and `npm run build` after the refactors.

## Remaining Work

### High Priority

1. Add real top-up/payment flow for paid credits.
2. Add owner admin actions:
   - manual credit grants
   - tier changes
   - search/filter/export
3. Add hosted deployment checklist and smoke-test script.

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
- **Payments / top-up:** not yet implemented
- **Docs / generated artifact cleanup:** improved but should still be rechecked before final handoff

## Immediate Next Action Recommendation

Incoming agent should first:
1. read `PROJECT_CONTEXT_AGNOSTIC.md`,
2. read `TAKEOVER_RULES.md`,
3. treat `neuralmob` source as canonical over stale generated docs,
4. validate local and hosted env assumptions,
5. then build the real top-up/payment flow.
