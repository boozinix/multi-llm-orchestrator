# Cursor Master Spec v3 (Working Draft)

This repository currently contains a UX synthesis pipeline and generated Vite artifacts.

When moving to production architecture, enforce:

1. Next.js 15 (App Router) + Tailwind v4
2. Prisma + SQLite local-first persistence
3. Adaptive component architecture:
   - `src/components/adaptive`
   - `src/components/ui`
   - `src/lib`
   - `prisma`
4. Sovereign Ledger design contract:
   - Figma aesthetics (Emerald/Slate, rounded-3xl, Manrope)
   - Stitch Desktop layout for `md+`
   - Stitch Mobile interaction model for `<md`
5. Security:
   - no remote persistence by default
   - no PII leakage in logs
   - sanitize all user-sourced data before render

Update this file as implementation details stabilize.

