# Plan — Chain Mode (Sequential Review Orchestration)
Agent: Claude (main)
Created: 2026-05-03 00:00

## Goal
Add a third orchestration mode ("Chain") to NeuralMob. Bots run sequentially — each reviews and improves the previous bot's answer. Saves tokens vs Super mode and produces iteratively refined answers.

## Chunks
1. Chunk 1 — Types + Constants + Limits (types.ts, constants.ts, limits.ts)
2. Chunk 2 — Chain Prompts (prompts.ts)
3. Chunk 3 — Orchestrators streaming + non-streaming (orchestrator-stream.ts, orchestrator.ts)
4. Chunk 4 — API Route (route.ts)
5. Chunk 5 — FlowDiagram chain layout (FlowDiagram.tsx)
6. Chunk 6 — FlowPanel + 3-way Mode Toggle (page.tsx)
7. Chunk 7 — Stream rendering for chain phases (page.tsx)

## Risks & Decisions
- Chain reuses bot1/bot2/bot3Enabled toggles (no new config fields)
- No synth model needed for chain (each bot reviews directly)
- Prompts are complexity-aware (trivial queries get light treatment)

## Out of Scope
- New settings page changes
- Deployment to Vercel
- Testing with live API calls (manual verification only)
