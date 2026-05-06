# Plan — Slow Bot Timeout UX
Agent: Claude (main)
Created: 2026-04-28

## Goal
When one LLM is slow (no tokens in 10s), show a "Still waiting on Mind X" indicator in that
lane and give the user two buttons: Wait 10s more or Skip Mind X. Skipping resolves a
server-side promise race, so synthesis proceeds immediately without that bot.

## Chunks
1. Infrastructure — run-registry module + skip-bot API route
2. Server streaming — orchestrator gets runId + skip promise per slot; chat route emits runId
3. Client UI — per-slot timers, timed_out state, Wait/Skip buttons in streaming lanes

## Risks & Decisions
- Background LLM HTTP request continues after skip (skipped by promise race, not abort).
  Acceptable for MVP — request eventually times out at provider level.
- Race condition: bot may emit tokens after skip promise fires. Client guards "skipped" state
  so these are ignored visually.
- runId is a UUID known only to the client via SSE; skip endpoint requires auth session.

## Out of Scope
- Mid-stream stall detection (only handles no-initial-response case)
- Aborting the actual upstream HTTP connection (just races the promise)
