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

## Execution Order

1. Secure the repo and confirm no secrets are in source.
2. Use durable hosted storage for Vercel.
3. Enforce strict credit reservation and settlement.
4. Add owner admin visibility.
5. Add hosted top-up flow.
6. Polish UX and branding.
7. Improve orchestration quality.
8. Keep handoff artifacts current.

## Remaining Work

1. Test real Vercel deployment with actual env vars.
2. Test real Stripe checkout + webhook end to end.
3. Add admin actions for manual credit grants and tier changes.
4. Add smoke tests and/or scripted deployment validation.
5. Optionally regenerate the full code dump so it fully matches the live repo.
