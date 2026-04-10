# Project Plan

## Current Product Direction

Neural Mob supports:
- local owner mode with unlimited access
- local OpenRouter toggle vs direct provider keys
- hosted Clerk auth
- hosted OpenRouter-only routing
- starter credit for free users
- prepaid credits for paid users
- strict metering so users cannot overspend

## Current Deployment Reality

- Production domain is `https://neuralmob.xyz`.
- The current live deployment is behind the newest local work.
- The latest local-only fixes include:
  - mobile compatibility cleanup
  - updated favicon/share preview
  - first-run tour fixes
  - final-answer cutoff fix
  - improved independent multi-bot orchestration prompts and merge logic

## Execution Order

1. Secure the repo and confirm no secrets are in source.
2. Use durable hosted storage for Vercel.
3. Enforce strict credit reservation and settlement.
4. Add owner admin visibility.
5. Add hosted top-up flow.
6. Polish UX and branding.
7. Improve orchestration quality.
8. Keep handoff artifacts current.

## Deployment Work Split

### User Must Do

1. Configure the Vercel project and domain for `neuralmob.xyz`.
2. Add production environment variables in Vercel.
3. Create or connect hosted Postgres.
4. Configure Clerk production keys and production OAuth redirect URLs.
5. Configure Stripe live keys and webhook endpoint.
6. Run real browser QA on the live domain.

### Agent Must Do

1. Keep the code aligned with the hosted auth/billing model.
2. Harden production rate limiting and auth restrictions.
3. Push local fixes when the user asks.
4. Track progress and keep handoff files current.
5. Prepare and refine the deployment/QA checklist.

## Remaining Work

1. Save and deploy the latest local fixes when the user approves.
2. Test real Vercel deployment with actual env vars.
3. Test real Stripe checkout + webhook end to end.
4. Add admin actions for manual credit grants and tier changes.
5. Replace in-memory hosted rate limiting with a production-safe global strategy.
6. Add Clerk production-domain hardening.
7. Add smoke tests and/or scripted deployment validation.
8. Optionally regenerate the full code dump so it fully matches the live repo.
