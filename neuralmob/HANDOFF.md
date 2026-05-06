# NeuralMob Handoff — 2026-04-17

## Branch
`feature/claude-design-ux` — based off `main`, not yet merged

## Latest commit
`f1c8779` (centering fix pending commit as `6`)

---

## What was completed this session

### Design handoff implementation
Three pages from `UX/design_handoff_neural_mob/pages/` (home.html, chat.html, settings.html) were fully implemented into the Next.js app.

### globals.css
- Added `:root` design token block: `--nm-navy`, `--nm-navy-2`, `--nm-ink`, `--nm-ink-dim`, `--nm-ink-faint`, `--nm-violet`, `--nm-violet-dim`, `--nm-teal`, `--nm-coral`, `--nm-line`, `--nm-line-2`
- Updated `.bot-pill-1/2/3` border colors → teal(`#4edea3`) / coral(`#ff8a6b`) / violet(`#d0bcff`)

### workspace/page.tsx
- **Idle/home state**: greeting (JetBrains Mono, time-aware), Fraunces serif heading "What should *the mob* think about today?", mode toggle (Quick/Super) with 2px solid borders + violet fill on selected, 4 prompt suggestion cards with 2px borders
- **Stream lanes**: bot blocks render as 3-column grid with color-coded borders (teal/coral/violet), Σ synthesis as full-width block
- **SideNav**: NM logomark, Fraunces "Neural Mob" brand, dashed separator, history items with relative timestamps from `c.updatedAt`
- **Port**: dev server now on `3040` (package.json updated)

### settings/page.tsx
- Full board layout replacing old card/accordion design
- Provider status table with inline accordion (click "Edit"/"Add" to expand key input)
- 2-col grid: routing card (OpenRouter toggle) + billing card (balance + top-up)
- Model assignments table: 4 rows (bot1/2/3/synth) with color-coded selects
- Keys/BYOK receipt table with inline expand-on-click rows
- Privacy footer with § icon
- All existing state preserved: `draft`, `showSecrets`, `saved`, `usage`, `billing`, `openAccordion`, `topupLoading`, `freeModelIds`, `showcaseMode`, `models`, `modelGroups`
- All handlers preserved: `handleSave`, `handleDiscard`, `handleSignOut`, `handleTopUp`

### Landing page (page.tsx)
- Orchestra landing: animated hero card, modes section, proof section, pricing section
- `.landing-u` underline animation in globals.css

---

## Model color system
| Slot | Model | Color | Hex |
|------|-------|-------|-----|
| bot1 | GPT | Teal | `#4edea3` |
| bot2 | Claude | Coral | `#ff8a6b` |
| bot3 | Gemini | Violet | `#d0bcff` |

---

## Key files

| File | Role |
|------|------|
| `src/app/page.tsx` | Orchestra landing page |
| `src/app/workspace/page.tsx` | Main workspace UI (~1700 lines) |
| `src/app/settings/page.tsx` | Settings board |
| `src/app/globals.css` | Design tokens + custom CSS |
| `src/lib/constants.ts` | Model list, `modelLabel()`, defaults |
| `src/lib/prompts.ts` | System prompts + complexity classifier |
| `src/lib/server/orchestrator-stream.ts` | Parallel streaming orchestration |
| `src/store/chat-store.ts` | Zustand chat state (`useChatStore`) |
| `src/store/settings-store.ts` | Zustand settings state (`useSettingsStore`) |
| `GIT_TRACKER.csv` | Commit log |
| `PROGRESS_TRACKER.md` | Task completion status |

---

## Do not change
- Sidebar background gradient — user has asked 5+ times
- `font: inherit` on buttons — needed for Tailwind text utilities to work
- NAVIGATE/HISTORY label color `#d0bcff`
- Internal TypeScript type names (`bot1`, `BotRunOutput`, `slotId`, etc.)
- `.env.local` — never commit

---

## Dev server
```bash
cd neuralmob
npm run dev   # runs on http://localhost:3040
```

---

## Next steps
- [ ] Test workspace streaming with a real run (verify lane-style blocks render)
- [ ] Test settings page save/discard/sign-out
- [ ] Merge `feature/claude-design-ux` → `main` when approved
- [ ] Deploy to Vercel (only when explicitly instructed)
