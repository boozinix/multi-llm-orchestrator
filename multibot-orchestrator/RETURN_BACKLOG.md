# Return Backlog (Plan + Audit)

Last updated: 2026-04-08

This file captures the "come back to this" workstream:
- Product/architecture migration plan (Clerk + Stripe credits + OpenRouter-only)
- Security/deployment audit follow-ups
- Local-owner bypass requirement

---

## 1) Approved Direction

- Move away from BYOK for production.
- Use **OpenRouter server key** + internal metering.
- Use **Clerk** for real auth.
- Use **Stripe** for prepaid credits.
- Use **Postgres (Neon-compatible)** for durable usage + billing data.
- Freemium model:
  - Free tier: limited calls + low-tier models only.
  - Paid users: buy credits (e.g., $5) and consume for full-tier models.

---

## 2) Core Plan (from `clerk_credits_architecture_f0d02aaa.plan.md`)

### Goal
Replace BYOK with a production architecture where users authenticate via Clerk, consume prepaid credits for OpenRouter usage, and are restricted by plan tier/model tier with auditable metering.

### Architecture Decisions
- Auth: Clerk
- Payments: Stripe
- DB: Postgres (Neon-compatible)
- LLM provider: OpenRouter only

### Todo List
1. Integrate Clerk auth middleware and require authenticated userId on all API routes.
2. Implement Postgres schema for plans, entitlements, usage_events, and immutable credit_ledger.
3. Refactor chat/orchestrator to OpenRouter-only and remove BYOK paths.
4. Add Stripe checkout + webhooks to grant prepaid credits.
5. Enforce plan-tier model access and transactional reserve/debit/refund.
6. Update UI for model locks, balance, add-credits flow, and run-cost display.
7. Add reconciliation checks, idempotency keys, and audit logging.

### Acceptance Criteria
- Unauthenticated requests denied.
- Free users blocked from pro-tier models.
- Paid users can buy credits and spend accurately.
- Every model call has usage_event + matching ledger mutation.
- Credit balance never goes negative under concurrency.
- Billing webhooks are idempotent.

---

## 3) Local Owner Dev Bypass (explicit requirement)

For local development, owner email should have:
- unlimited runs
- unlimited API calls
- all model tiers unlocked
- no credit deduction

Suggested guard:
- Enabled only when `NODE_ENV !== "production"`
- Email in `DEV_OWNER_EMAILS` allowlist
- Server-side only (never client-side flags)
- Show visible UI badge: `Owner Dev Mode: Unlimited`

---

## 4) Audit Follow-ups to Address During Migration

These are the important outstanding items when moving to production SaaS:

### Deployment/Security
- Replace email-only login with real auth identity flow (Clerk).
- Replace in-memory limiter with distributed limiter (Upstash/Redis/KV).
- Move from SQLite to Postgres (serverless-safe persistence).
- Tighten CSP over time (remove `unsafe-eval` if possible).
- Add CSRF protection strategy for authenticated mutating routes.
- Ensure no request body logging (especially keys/PII).

### Reliability/Metering
- Strict token/cost metering from OpenRouter usage fields.
- Transactional reserve/debit/refund with immutable ledger.
- Retry + fallback policy for provider/transient errors.
- Global request timeout and cancellation path.
- Reconciliation job: ledger totals vs usage totals.

### Product/UX
- Tier-gated model catalog with lock states.
- Credits dashboard + per-run cost transparency.
- Purchase flow + webhook-driven credit grants.
- Admin/audit tooling for billing disputes and adjustments.

---

## 5) Suggested Execution Order (next time)

1. Clerk integration + user scoping in DB
2. Postgres schema + data layer refactor (async)
3. Stripe credit packs + webhooks
4. OpenRouter-only orchestration + hard metering
5. Tier gating + UI lock states + balance widgets
6. Distributed rate limits + reconciliation + observability

