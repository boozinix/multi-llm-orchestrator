# NeuralMob Design Refinement Brief
**For Claude Design Product**

---

## 🎯 Goal
Refine the NeuralMob UI for polish and usability. Subtle improvements only—**do not change colors, structure, or overall layout**. Primary issue: scrolling behavior needs fixing to feel smooth and platform-native.

---

## 📐 Design System

### Color Palette (DO NOT CHANGE)
- **Navy base**: `#0b1326` (background)
- **Violet/Primary**: `#d0bcff` (accent, labels, highlights)
- **Teal/Bot1**: `#4edea3` (GPT model lane)
- **Coral/Bot2**: `#ff8a6b` (Claude model lane)
- **Violet/Bot3**: `#d0bcff` (Gemini model lane)
- **Text**: `#dae2fd` (light text)
- **Dim text**: `#a7a2c2` (secondary)
- **Borders**: `rgba(208, 188, 255, 0.14)` (primary), `rgba(208, 188, 255, 0.06)` (subtle)

### Typography (DO NOT CHANGE)
- **Headlines**: Fraunces (serif, 300–900 weight)
- **Body**: Manrope (sans-serif, 300–800 weight)
- **Mono**: JetBrains Mono / SFMono (code, timestamps)

### Spacing & Radius (DO NOT CHANGE)
- Radius: `0.25rem` (base), `0.5rem` (lg), `0.75rem` (xl), `9999px` (full)
- Gutters: 2px borders on interactive elements (mode toggle, etc.)

### Gradient/Effects (Allowed to Refine)
- **Glass panels**: `rgba(255, 255, 255, 0.04)` + `blur(20px)` + `saturate(180%)`
- **Mesh background**: Three radial gradients with animation (`mesh-drift` 20s)
- **App shell glow**: Soft radial gradients (violet + teal)

---

## 🖥️ Current Pages & Components

### 1. **Landing Page** (`src/app/page.tsx`)
- **Hero**: Animated underline, streaming word-by-word animation
- **Modes section**: 3 cards (Quick, Super, Synthesis)
- **Proof section**: 3-column truth table (GPT, Claude, Gemini confidence + verdicts)
- **Pricing**: Receipt-style cost breakdown

**Issues to polish:**
- Ensure animations feel premium (no jank on scroll reveal)
- Button hover states smooth and visible
- Text line-height and letter-spacing precise

### 2. **Workspace** (`src/app/workspace/page.tsx`)
- **Left sidebar**: History, SideNav (logo, branding, relative timestamps)
- **Main area**: Idle state (greeting + prompt cards) or Stream state (3 lanes)
- **Lane cards**: Teal (GPT), Coral (Claude), Violet (Gemini)
- **Synthesis block**: Summary + source attribution
- **Composer**: Glass input area at bottom

**SCROLL ISSUE — PRIMARY FOCUS**
- The workspace currently doesn't scroll smoothly
- **Target**: Outer `overflow-y-auto` should handle all scroll, no nested scrolling
- **Sidebar**: Should NOT scroll independently; scroll locks to main area
- **Lanes area**: Should be scrollable when tall, but only the main area—not nested
- **Composer**: Should stick to bottom and NOT scroll with content

**Other polish needs:**
- Message spacing and padding consistency
- Lane card depth (shadows) could be more refined
- Hover states on history items subtle but clear

### 3. **Settings** (`src/app/settings/page.tsx`)
- **Provider table**: API keys, model assignments
- **Routing/Billing grid**: Config options
- **Model picker**: Selectable groups

**Polish needs:**
- Table row hover states
- Input focus rings clarity
- Grid spacing consistency

---

## 🎨 Specific Refinements We Want

### High Priority (Fix)
1. **Scroll behavior** — Smooth, platform-native scrolling. No janky nested scrolling. Composer sticky at bottom.
2. **Hover state consistency** — Buttons, cards, history items should have subtle highlight/shadow lift
3. **Focus rings** — Input focus states crisp and visible without being garish

### Medium Priority (Polish)
4. **Line heights** — Ensure headlines and body text stack with correct leading
5. **Letter spacing** — Current `-0.03em` on h1–h6; consider if tighter on display sizes feels better
6. **Shadow depth** — App panels use `0 24px 64px`; consider if secondary elements need refinement
7. **Transition timing** — Currently `180ms ease`; consider if this feels responsive or sluggish on user actions
8. **Glass effect** — Ensure backdrop blur doesn't feel too heavy on large areas

### Low Priority (Optional)
9. **Animation feel** — Mesh gradient animation smooth? Consider if easing needs adjustment
10. **Mobile responsiveness** — Sidebar collapse behavior, modal centering, touch targets

---

## 🚫 Hard Constraints (DO NOT CHANGE)

- **No color changes** — Violet, Teal, Coral exact as specified
- **No structure changes** — 3-lane layout, sidebar position, composer placement
- **No font changes** — Fraunces + Manrope + JetBrains Mono
- **Button styling** — `font: inherit` required for Tailwind text utilities
- **Type names** — Internal types stay as `bot1`, `bot2`, `bot3`, `BotRunOutput`, etc.

---

## 📦 Deliverables Expected

1. **Refined HTML/CSS** — Complete `workspace/page.tsx`, `page.tsx`, `settings/page.tsx`, and `globals.css`
2. **Component exports** (if applicable) — Any new `.tsx` components or style modules
3. **Implementation notes** — Quick summary of what changed and why (scroll fix specifics, hover states, etc.)

---

## 🔗 Current Files

- **`src/app/globals.css`** — Design tokens, animation keyframes, utility classes
- **`src/app/page.tsx`** — Landing page (Next.js)
- **`src/app/workspace/page.tsx`** — Main workspace (React client component)
- **`src/app/settings/page.tsx`** — Settings board

**Tech stack:** Next.js 15, React, Tailwind CSS, Zustand (state management)

---

## 💬 Questions for Claude Design

1. When refining scroll behavior, is it best to move from nested scrolls to single-area scroll with sticky footer?
2. Should hover states use opacity shift, shadow lift, or both?
3. For glass panels, does the current blur feel right, or should we reduce saturation boost?

---

**Ready to send to Claude Design. Once refined HTML is returned, I'll integrate it back into the codebase.**
