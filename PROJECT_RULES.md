# Project Rules

## Canonical Truth

- Treat source files in `neuralmob` as canonical truth.
- Treat generated dumps and generated summaries as secondary artifacts.
- If generated docs conflict with source, source wins.

## Secret Safety

- Never commit real API keys, tokens, webhook secrets, or `.env.local`.
- Keep production secrets only in Vercel environment variables.
- `.env.example` may contain placeholders only.
- Never hardcode credentials in code, docs, scripts, or tests.

## Runtime Model

- Local mode:
  - owner-friendly
  - unlimited access for owner accounts
  - OpenRouter toggle can route all calls through OpenRouter
  - when toggle is off, local provider-specific keys can be used directly
- Hosted / Vercel mode:
  - Clerk auth
  - OpenRouter-only for model routing
  - free users get starter credit and cheap models only
  - paid users spend prepaid credit

## Billing Rules

- Hosted users must never be allowed to exceed available credit.
- Reserve worst-case run credit before execution.
- Settle actual usage after completion.
- Release reservation on failure.
- Owner unlimited accounts bypass billing and limits.

## Data Rules

- Local persistence can use SQLite.
- Hosted persistence must use durable Postgres via `DATABASE_URL`.
- Conversations must always be user-scoped.
- Billing events, reservations, and top-ups must be durable and auditable.

## Delivery Rules

- Verify major changes with `npm run lint` and `npm run build`.
- Keep handoff artifacts updated when major architecture changes happen.
- Do not overwrite source just to refresh generated artifacts unless requested.
