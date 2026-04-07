# The Sovereign Ledger — Agent Orchestration Context

## Expert Agent Persona

- **Role:** Senior Full-Stack Financial Software Engineer + UX Architect
- **Specialty:** Institutional-grade finance UX and privacy-first local-first architecture
- **Mission:** Build a premium Net Worth Tracker that unifies:
  - Figma brand/aesthetics
  - Stitch Desktop information density/layout efficiency
  - Stitch Mobile engagement patterns

## Design Synthesis Rulebook (Priority Order)

1. **Aesthetics (Figma wins)**
   - Emerald + Slate-900 visual language
   - Rounded-3xl radii
   - Manrope-first typography
2. **Desktop Layout (Stitch Desktop wins)**
   - `md` and up: fixed sidebar + dense dashboard composition
3. **Mobile Layout (Stitch Mobile wins)**
   - below `md`: floating/bottom tab navigation
   - dark net-worth hero card and high-clarity mobile actions

## Technical Blueprint

- Frontend target: Next.js 15 (App Router), Tailwind CSS v4, Framer Motion
- Icons: Lucide React
- Data layer: Prisma + SQLite (strictly local)
- Components: adaptive, single component with responsive breakpoints

### Intended Directories

- `src/components/adaptive/`
- `src/components/ui/`
- `src/lib/`
- `prisma/`

## Security / Data Rules

- Financial data remains local-first.
- Never leak sensitive values in logs or telemetry.
- Sanitize display state before rendering.

## Interaction / Motion

- Use Framer Motion for page transitions + hover/tap states.
- Interactions should feel calm, premium, and fast.

