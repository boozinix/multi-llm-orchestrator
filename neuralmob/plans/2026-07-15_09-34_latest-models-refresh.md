# Plan — Latest Models Refresh + Web Search + Pro/Regular Tiers
Agent: Claude (main)
Created: 2026-07-15 09:34

## Goal
NeuralMob's current model roster (`src/lib/constants.ts`) contains fabricated / outdated IDs
(e.g. `openai/gpt-5.5`, `anthropic/claude-opus-4.7`, `google/gemini-3.1-pro-preview`,
`deepseek/deepseek-v4-pro`). These do not resolve on OpenRouter's live catalog and were
produced by models reasoning from training memory rather than checking live data.

This task replaces the roster with a **live-verified** set of OpenRouter model IDs across four
tiers (Flagship / Balanced / Budget / Experimental+Chinese), adds a **Pro vs Regular** UX toggle
that maps to OpenRouter's unified `reasoning.effort` parameter, and adds an **optional web-search
grounding toggle** via OpenRouter's `:online` suffix / web plugin — so every future "what's the
latest" question is answered from live data, not memory.

## Success Criteria
- Every model ID in `OPENROUTER_MODELS` is confirmed live on `https://openrouter.ai/api/v1/models`
  on 2026-07-15 with source URL logged.
- Defaults (`DEFAULT_MODELS`, `DEFAULT_MODELS_FREE_TIER`) use only live IDs.
- Legacy alias map preserves user-saved settings — no user's saved config breaks.
- UI has a **Pro / Regular** toggle per run that sets `reasoning.effort` (`high` / `medium`; `low`
  for a "Fast" option if we keep three levels) — one control, applied across all providers.
- UI has a **Web Search** toggle that appends `:online` (or sends the `plugins: [{id:"web"}]`
  payload) to the request when on.
- Tiers surface in the picker: Flagship, Balanced, Budget, Experimental / Chinese.
- QA run passes for one super, one chain, and one quick run with the new roster.

## Chunks

### Chunk 1 — Live-verify roster & write source-of-truth doc
- Query `https://openrouter.ai/api/v1/models` (no key needed for listing).
- For each provider (OpenAI, Anthropic, Google, xAI, DeepSeek, Alibaba/Qwen, Moonshot, Mistral,
  + at least one more Chinese lab e.g. Z-AI/GLM, Zhipu, or MiniMax), pick the current:
  - Flagship (top capability)
  - Balanced (mid price/perf)
  - Budget (cheapest usable)
  - Experimental / notable open-weight (where applicable)
- Confirm input/output price per 1M and context window from each model's OpenRouter page.
- Write `docs/MODEL_ROSTER_2026-07-15.md` with the full table (ID, tier, price, context, source URL).
- Explicitly mark any ID we could not confirm as `[UNVERIFIED]` and exclude it from code.
- Files touched: 1 new doc. No code changes.

### Chunk 2 — Refactor `constants.ts`: tiered model schema
- Extend `ModelOption` with `{ tier: 'flagship' | 'balanced' | 'budget' | 'experimental', reasoningMode: 'always-on' | 'optional' | 'none' }`.
- Replace `OPENROUTER_MODELS` with the verified roster from Chunk 1.
- Update `LEGACY_MODEL_ALIASES` — map every old (now-invalid) ID to its closest verified successor,
  so returning users' saved settings still resolve. Keep entries additive; don't delete old aliases.
- Update `DEFAULT_MODELS` and `DEFAULT_MODELS_FREE_TIER` to verified IDs.
- Update `GROUPED_MODELS` — add groupings for new provider(s) added in Chunk 1.
- Files touched: `src/lib/constants.ts`, `src/lib/types.ts` (`ModelConfig` if tier field is stored).

### Chunk 3 — Pro/Regular reasoning toggle: types + store
- Add `reasoningEffort: 'low' | 'medium' | 'high'` to `FlowConfig` (or a new `RunOptions` type
  if that's cleaner given the graphify-visible split).
- Default: `medium` (Regular). "Pro" = `high`. Optionally add "Fast" = `low`.
- Persist in `settings-store.ts` via zustand.
- Normalize in `normalizeFlowConfig()`.
- Files touched: `src/lib/types.ts`, `src/lib/constants.ts`, `src/store/settings-store.ts`.

### Chunk 4 — Wire reasoning param through the OpenRouter caller
- In `src/lib/openrouter.ts` (`callModel()` and `streamModel()`), accept a `reasoning` option
  and include `reasoning: { effort: 'low'|'medium'|'high' }` in the request body per
  https://openrouter.ai/docs/use-cases/reasoning-tokens.
- For providers where reasoning is always-on (e.g. o-series, DeepSeek-R-style), the effort field
  is still honored — no branching needed there; verify from docs.
- Thread the option down from orchestrator calls (`runQuickOrchestrator`, `runSuperOrchestrator`,
  `runChainOrchestrator` + streaming counterparts) so each phase uses the same effort.
- Files touched: `src/lib/openrouter.ts`, `src/lib/server/orchestrator.ts`,
  `src/lib/server/orchestrator-stream.ts`.

### Chunk 5 — Web-search toggle: server side
- Add `webSearchEnabled: boolean` to `FlowConfig`, default `false`.
- In `callModel()` / `streamModel()`, when enabled either:
  - append `:online` to the model ID (simplest path, per OpenRouter web-search docs), OR
  - send `plugins: [{ id: 'web' }]` in the body.
- Pick one approach (`:online` is simpler; document choice in the plan-decisions note in the doc).
- Files touched: `src/lib/openrouter.ts`, orchestrator files (thread the flag), `constants.ts`
  (normalize default), types.

### Chunk 6 — UI: model picker tier labels + provider groups
- In `src/app/settings/page.tsx` and any picker in `src/app/workspace/page.tsx`, render group
  headers by tier or provider — keep provider groups but add tier badges (🥇 Flagship, ⚖️ Balanced,
  💰 Budget, 🧪 Experimental).
- Update `modelLabel()` if we now store tier separately (avoid duplicating emojis).
- Files touched: `src/lib/constants.ts` (label helpers), `src/app/settings/page.tsx`,
  `src/app/workspace/page.tsx`.

### Chunk 7 — UI: Pro/Regular + Web Search toggles in run controls
- Add two toggles to the workspace run controls (near model picker or in a compact "Run options"
  row): a `Regular / Pro` (or `Fast / Regular / Pro`) segmented control, and a `Web search`
  toggle.
- Wire to `useSettingsStore`.
- Files touched: `src/app/workspace/page.tsx` (and its FlowDiagram if it displays run mode),
  `src/store/settings-store.ts`.

### Chunk 8 — QA + smoke test
- Run `npm run dev` locally on :3040 (per package.json). Do NOT kill port blindly — check
  `lsof -i :3040` first per global rules.
- Manual smoke: one Quick, one Super, one Chain run with (Regular, no web), then (Pro, web on).
- Confirm no request fails with "model not found" and web-grounded run cites live sources.
- Update `PROGRESS_TRACKER.md` and `GIT_TRACKER.csv` after user gives commit go-ahead.
- Files touched: possibly `qa-api-tests.js` for a smoke test entry.

## Risks & Decisions
- **Do NOT auto-commit.** Per global rules, only commit when the user says so.
- **Do NOT deploy to Vercel** unless explicitly asked.
- Model IDs on OpenRouter change; the roster doc is dated. Include a "verified on" date in the
  doc header so future refreshes are cheap.
- `:online` suffix costs extra tokens per call — put web search behind an explicit toggle,
  never on by default.
- Some providers (o-series, GPT-5-style thinking, Claude thinking tiers, DeepSeek reasoner)
  charge separately for reasoning tokens. Flag this in the doc and in the Pro tooltip.
- Legacy alias map must remain additive; deleting entries will silently reset users' saved
  settings.
- Next.js in this repo has breaking changes (per neuralmob/AGENTS.md) — check
  `node_modules/next/dist/docs/` before adding any new route/handler code, though this task
  should be mostly non-routing.

## Out of Scope
- Rebuilding the judge prompt to enforce live-browsing (the "Prompt 2" you shared) — that's a
  separate task worth doing after, but not part of this UI/roster refresh.
- Adding a full "sources cited" panel for web-search results — MVP just enables the flag.
- Per-model reasoning effort overrides (all four slots share one effort value for now).
- Billing/pricing recomputation for reasoning-token surcharges (surface in UI copy only).
