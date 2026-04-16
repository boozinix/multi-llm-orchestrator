# NeuralMob Handoff — 2026-04-15

## Commit
`2adca7b` on `main`

---

## What was completed this session

### Backend
- **Parallel streaming** (`orchestrator-stream.ts`): all bot slots now fire with `Promise.all` instead of sequential `for...await`. Time = max(T1,T2,T3) instead of T1+T2+T3.
- **Adaptive prompts** (`prompts.ts`): `classifyQueryComplexity(query)` returns `'trivial' | 'simple' | 'complex'`. Trivial = ~15 token prompt, simple = ~25 token, complex = full original prompts. No extra LLM call needed.

### UI changes
- Animated mesh background (`body::after`, `mesh-drift` 20s keyframe)
- Desktop top bar removed (`lg:hidden`) — Guide moved into sidebar nav
- Sidebar: original dark gradient (`rgba(11,19,38,0.94)` → `rgba(9,16,30,0.98)`) — do NOT change this
- NAVIGATE / HISTORY labels: `text-xs font-mono tracking-[0.2em] uppercase text-[#d0bcff]` (pink)
- Nav items (Chat, API Keys, Settings, Guide): `text-[11px]`
- History items: `text-[11px]`
- "Bot" renamed to "Mind" everywhere in display strings (internal types unchanged: `bot1Enabled`, `BotRunOutput` etc.)
- Mind pills in composer: `text-[9px]`, emoji/suffix stripped with `.split("—")[0].trim()`
- Hero welcome state: Fraunces serif heading, `h-full flex-col items-center justify-center pb-8`
- FlowDiagram: node glow pulse (`<animate>`), output ring pulse, edge glow trail, `flow-edge-active` CSS class
- CopyTextButton: SVG clipboard icon (no text)

---

## Outstanding issue (what triggered end of session)

**Sidebar nav item font size looks too large on device.**

The code says `text-[11px]` for Chat/API Keys/Settings/Guide but the user's screenshots show them rendering large (~18-20px visually). Root cause is **not yet diagnosed**.

Possible causes to investigate in the next session:
1. `button { font: inherit; }` in `globals.css` — buttons inherit body font. Check if the `h1` headline font rule (`font-family: var(--font-family-headline)`) is somehow cascading into the sidebar since the `h1` is a sibling inside the same `<aside>`.
2. The `font-semibold` / `font-medium` on the buttons combined with Manrope rendering larger than expected at 11px.
3. The `py-2` padding making items feel visually large even if text is correct size.
4. Screenshots may be from an older deployed Vercel build (not the current local code). Ask user to hard-refresh or redeploy.

**Recommended first step in next session:** Ask user to open DevTools on the sidebar nav button and inspect the computed `font-size`. If it says 11px, the issue is visual perception (padding/icon size) not actual font size. If it says something larger, trace the cascade.

---

## Files to know

| File | Role |
|------|------|
| `src/app/workspace/page.tsx` | Main workspace UI (~1700 lines) |
| `src/app/workspace/FlowDiagram.tsx` | SVG flow diagram |
| `src/app/globals.css` | All custom CSS classes + theme tokens |
| `src/lib/constants.ts` | Model list, `modelLabel()`, defaults |
| `src/lib/prompts.ts` | All system prompts + complexity classifier |
| `src/lib/server/orchestrator-stream.ts` | Streaming orchestration (parallel) |
| `src/lib/server/orchestrator.ts` | Non-streaming orchestration |

---

## Do not change
- Sidebar background gradient (user has asked 5+ times)
- `font: inherit` on buttons (needed for Tailwind text utilities to work)
- NAVIGATE/HISTORY label color `#d0bcff`
- Internal TypeScript type names (`bot1`, `BotRunOutput`, etc.)
