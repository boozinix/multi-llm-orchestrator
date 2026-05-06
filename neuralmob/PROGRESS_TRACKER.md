# Progress Tracker
Last updated: 2026-05-03 00:45

## Branch: feature/claude-design-ux

### Previous sessions — all complete
See HANDOFF.md for full summary of design handoff (2026-04-17).
See commit 9e632b0 for slow-bot timeout UX (2026-04-28).

## Current session — Chain Mode Feature (2026-05-03)

### Chunk 1 — Types + Constants + Limits
- [x] `types.ts` — add `"chain"` to FlowConfig.mode
- [x] `constants.ts` — accept `"chain"` in normalizeFlowConfig
- [x] `limits.ts` — add chain branch to estimateApiCalls

### Chunk 2 — Chain Prompts
- [x] `prompts.ts` — buildChainFirstSystemPrompt, buildChainReviewerSystemPrompt, buildChainReviewerUserPrompt

### Chunk 3 — Orchestrators
- [x] `orchestrator-stream.ts` — runChainOrchestratorStream + chain phases
- [x] `orchestrator.ts` — runChainOrchestrator

### Chunk 4 — API Route
- [x] `route.ts` — route chain mode to new orchestrators

### Chunk 5 — FlowDiagram
- [x] `FlowDiagram.tsx` — chain layout in buildLayout

### Chunk 6 — FlowPanel + Mode Toggle
- [x] `page.tsx` — 3-way pill toggle + chain flow panel + idle area + submit button

### Chunk 7 — Stream Rendering
- [x] `page.tsx` — handle chain phases in streaming UI

## Pending / backlog (carried over)
- [ ] Test chain mode with real run
- [ ] Test slow-bot timeout UX with a real run
- [ ] Test workspace streaming with real run
- [ ] Test settings page save/discard/sign-out flows
- [ ] Merge feature/claude-design-ux -> main when approved
- [ ] Deploy to Vercel (when explicitly instructed)
