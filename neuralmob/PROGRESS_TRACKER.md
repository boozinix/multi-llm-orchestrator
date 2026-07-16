# Progress Tracker
Last updated: 2026-07-15 10:15

## Current session — Latest Models Refresh + Web Search + Pro/Regular (2026-07-15)
Branch: `sandbox/latest-models-refresh` (git worktree at `../neuralmob-models-sandbox`)
Plan: `plans/2026-07-15_09-34_latest-models-refresh.md`

### Chunks
- [x] Chunk 1 — Live-verified roster; wrote `docs/MODEL_ROSTER_2026-07-15.md`.
- [x] Chunk 2 — `constants.ts` rewritten: `ModelOption.tier`, 19 verified `OPENROUTER_MODELS`, additive `LEGACY_MODEL_ALIASES` (fabricated IDs from prior sessions mapped to closest verified successors), new `DEFAULT_MODELS` + free-tier defaults, `GROUPED_MODELS` gains z-ai + minimax groups, tier-sort helper, `modelTier()` helper.
- [x] Chunk 3 — `types.ts`: `ReasoningEffort` type + `FlowConfig.reasoningEffort` + `FlowConfig.webSearchEnabled`. `settings-store.ts`: fields + setters + merge migration. `constants.ts::normalizeFlowConfig` normalizes both.
- [x] Chunk 4 — `openrouter.ts::ModelRoutingOptions` gains `reasoningEffort` + `webSearch`; `reasoningParam()` helper adds `reasoning: { effort }` to every chat body; threaded via `orOpts` through all six orchestrator entrypoints (`runQuickOrchestrator`, `runSuperOrchestrator`, `runChainOrchestrator` + streaming variants).
- [x] Chunk 5 — `applyWebSearchSuffix()` appends `:online` only when routing via OpenRouter (never on direct-provider fallbacks). Wired into `callModel`, `streamModel`, and both OpenRouter fallback branches.
- [x] Chunk 6 — Tier badges present in every label (🥇⚖️💰🌏); each provider group sorted flagship→experimental via `byTier`.
- [x] Chunk 7 — Workspace run-controls row: Fast/Regular/Pro segmented control + 🌐 Web on/off toggle, both wired to `setFlow` (persists via zustand). Kept Simple/Advanced control alongside.
- [x] Chunk 8 — Pushed sandbox → Vercel preview built READY (dpl_gSrFof3SEhFquHMVWF6AJ6jz1xSR); user reviewed & approved; merged into `feature/claude-design-ux` and fast-forwarded `main`.

### Verification
- `tsc --noEmit` on sandbox — clean.
- Vercel preview built + reviewed on `multibot-orchestrator-git-sandbox-lat-2c738c-boozinixs-projects.vercel.app`.
- Merged to `feature/claude-design-ux` @ 4f59b4c → fast-forwarded to `main`.

### Notes
- Do NOT git-commit or deploy without explicit user go-ahead.
- Legacy alias map MUST remain additive so returning users' saved model IDs still resolve.
- `:online` costs extra per call — OFF by default.
- Reasoning-token surcharges exist on Anthropic thinking tiers and OpenAI `-pro` variants — surface in tooltip only, don't recompute pricing.
- Next.js in this repo has breaking changes (see `neuralmob/AGENTS.md`) — check `node_modules/next/dist/docs/` before any router/handler changes.
- DeepSeek + Meta-Llama excluded this pass (not returned by live catalog). Re-verify via `curl … | jq` before adding.

---

## Previous session — Chain Mode Feature (2026-05-03)
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
