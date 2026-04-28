# Progress Tracker
Last updated: 2026-04-28 00:30

## Branch: feature/claude-design-ux

### Previous session (2026-04-17) — all complete
See HANDOFF.md for full summary.

## Current session — Slow bot timeout UX (2026-04-28)

### Chunk 1 — Infrastructure
- [x] Plan file created — `plans/2026-04-28_slow-bot-timeout-ux.md`
- [x] `src/lib/server/run-registry.ts` — new module (per-slot skip resolvers)
- [x] `src/app/api/chat/skip-bot/route.ts` — new POST endpoint

### Chunk 2 — Server streaming changes
- [x] `src/lib/server/orchestrator-stream.ts` — `run_id` StreamEvent type, `runId` in StreamInput, skip Promise.race per slot
- [x] `src/app/api/chat/route.ts` — generate runId, emit `run_id` SSE event, createRunEntry/removeRunEntry

### Chunk 3 — Client UI
- [x] `src/app/workspace/page.tsx` — activeRunId + slotWaiting state, slotTimerRef, handleWaitMore/handleSkipSlot, processSseBlock timeout logic, timed_out/skipped lane rendering

## Pending / backlog (carried over)
- [ ] Test slow-bot timeout UX with a real run
- [ ] Issue 2: intent-aware synthesis (separate session)
- [ ] Test workspace streaming with real run (lane-style blocks in action)
- [ ] Test settings page save/discard/sign-out flows
- [ ] Merge feature/claude-design-ux → main when approved
- [ ] Deploy to Vercel (when explicitly instructed)
