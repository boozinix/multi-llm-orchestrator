# Progress Tracker
Last updated: 2026-04-17 22:00

## Branch: feature/claude-design-ux

### Session goal
Implement the 3 app-page designs from `UX/design_handoff_neural_mob/pages/` into the live Next.js app, then polish.

## Tasks

### Landing page (page.tsx)
- [x] Update Google Fonts import (Fraunces italic 300–900, JetBrains Mono, full Manrope)
- [x] Add `@keyframes draw-underline` + `.landing-u` CSS class to globals.css
- [x] Implement Orchestra landing page — hero card, modes section, proof section, pricing section
- [x] Fix lint errors (unescaped entities in JSX)

### Globals / design tokens
- [x] Add `:root` design token block (--nm-navy, --nm-violet, --nm-teal, --nm-coral, --nm-line, etc.)
- [x] Update `.bot-pill-1/2/3` border colors → teal / coral / violet

### Workspace page (workspace/page.tsx)
- [x] Add `getTimeGreeting()` helper + `PROMPT_SUGGESTIONS` constant
- [x] Replace `phaseAccentClass` with `phaseColor` + updated accent classes (teal/coral/violet)
- [x] Update `BotOutputCard` slot colors to teal/coral/violet
- [x] Redesign SideNav brand section (NM logomark, Fraunces serif, dashed separator)
- [x] Update SideNav history items with relative timestamps
- [x] Replace idle state (centered icon) with home.html design: greeting + mode pills + prompt cards
- [x] Replace stream block list with lane-style columns (teal/coral/violet) + Σ synthesis block
- [x] Fix mode toggle borders — 2px solid, selected = rgba(208,188,255,.38) fill
- [x] Fix prompt card borders — 2px solid, sharper radius
- [x] Fix idle content centering — maxWidth 780 wrapper with mx-auto
- [x] Fix scroll — remove inner overflow-y-auto, remove h-full, outer scroll handles it
- [x] Dev server port → 3040 (package.json)

### Settings page (settings/page.tsx)
- [x] Full board layout matching settings.html design handoff
- [x] Provider status table (connected/disconnected, inline accordion edit)
- [x] Routing card (OpenRouter dev toggle)
- [x] Billing card (balance display, top-up buttons)
- [x] Model assignments table (bot1/2/3/synth, color-coded selects)
- [x] Keys/BYOK receipt table with inline expand
- [x] Privacy note footer
- [x] All existing state + handlers preserved

## Pending / backlog
- [ ] Test workspace streaming with real run (lane-style blocks in action)
- [ ] Test settings page save/discard/sign-out flows
- [ ] Merge feature/claude-design-ux → main when approved
- [ ] Deploy to Vercel (when explicitly instructed)
