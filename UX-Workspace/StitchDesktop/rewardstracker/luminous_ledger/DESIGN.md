# Design System Document: The Editorial Fintech Experience

## 1. Overview & Creative North Star: "The Kinetic Curator"
The Creative North Star for this design system is **The Kinetic Curator**. Unlike traditional fintech interfaces that feel like rigid spreadsheets, this system treats financial rewards as a premium lifestyle experience. It moves away from "Standard SaaS" layouts in favor of an editorial, app-like flow characterized by breathing room, fluid depth, and high-contrast color categorization.

By utilizing **intentional asymmetry**—such as offsetting large display type against floating cards—and **tonal layering**, we move beyond the "template" look. We are building a digital concierge that feels both authoritative and approachable.

---

## 2. Colors & Visual Soul
This system rejects the monochrome "safe" look of traditional finance. We use color not just for decoration, but as a primary navigational tool to categorize benefit types (e.g., Travel in Blue, Sustainability in Green, Luxury in Amethyst).

### Core Palette
- **Primary (Electric Blue):** `#0846ed` — Used for core actions and primary financial data.
- **Secondary (Emerald Green):** `#006a28` — Categorization for "Growth," "Cashback," or "Sustainability" benefits.
- **Tertiary (Soft Amethyst):** `#8539a3` — Categorization for "Luxury," "Lifestyle," or "Exclusive" perks.
- **Neutral/Surface:** `#f9f5ff` (Surface) to `#ffffff` (Container Lowest). A cool, lavender-tinted white that feels more premium than pure grey.

### The "No-Line" Rule
**Explicit Instruction:** Prohibit the use of 1px solid borders for sectioning content. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` card sits on a `surface` background. The change in tone is the border.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of fine paper. 
*   **Base:** `surface` (#f9f5ff)
*   **Sectioning:** `surface-container-low` (#f2efff)
*   **Interactive Cards:** `surface-container-lowest` (#ffffff)
*   **High-Priority Overlays:** `surface-bright` (#f9f5ff) with Glassmorphism.

### Signature Textures & Glass
To provide "soul," use subtle linear gradients for CTAs and Hero sections, transitioning from `primary` (#0846ed) to `primary_container` (#859aff). Use **Glassmorphism** (Backdrop Blur: 20px, Opacity: 80% of surface color) for floating navigation bars or modal headers to keep the vibrant background colors visible but diffused.

---

## 3. Typography: Editorial Authority
We pair **Manrope** (Display/Headlines) for its geometric, modern tech feel with **Plus Jakarta Sans** (Body/Labels) for its high legibility and friendly character.

*   **Display (Manrope):** Use `display-lg` (3.5rem) for total reward balances. The large scale creates a sense of "Wealth Editorial."
*   **Headlines (Manrope):** `headline-md` (1.75rem) should be used for section titles, often paired with generous top-padding to create a "magazine" feel.
*   **Body (Plus Jakarta Sans):** `body-lg` (1rem) is our workhorse. Ensure a line height of at least 1.6 for maximum breathability.
*   **Labels (Plus Jakarta Sans):** `label-md` (0.75rem) in `on_surface_variant` (#585781) provides metadata without cluttering the visual hierarchy.

---

## 4. Elevation & Depth: Tonal Layering
Traditional shadows are often a crutch for poor contrast. In this design system, we prioritize **Tonal Layering**.

*   **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#f2efff) background. This creates a "soft lift" that feels architectural rather than digital.
*   **Ambient Shadows:** If a card must "float" (e.g., a draggable reward tile), use a shadow with a 40px blur and 6% opacity. The color should be `#2b2a51` (on-surface) to ensure it feels like a natural shadow cast on our tinted background.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline_variant` (#aba9d7) at **15% opacity**. Never use 100% opaque lines.

---

## 5. Components

### Buttons & Interaction
*   **Primary Action:** Rounded (`9999px`), using a gradient from `primary` to `primary_dim`. High-contrast `on_primary` text.
*   **Category Buttons:** Use `secondary_container` or `tertiary_container` with their respective "On" colors to visually signal the benefit type being interacted with.

### Cards & Lists (The "No-Divider" Rule)
*   **Forbid Divider Lines:** Use vertical white space (calculated from our 1rem base spacing) or a subtle shift to `surface_container_high` on hover to separate list items.
*   **Rounding:** All cards must use `xl` (3rem) or `lg` (2rem) corner radii to maintain the "approachable app" aesthetic.

### Reward Chips
*   **Visual Language:** Small, pill-shaped (`9999px`) containers. For a "Travel" reward, use a `primary_fixed_dim` background with `on_primary_fixed` text. This high-chroma look makes categories immediately scannable.

### Feedback & Inputs
*   **Inputs:** Use `surface_container_low` as the field background. On focus, transition the background to `surface_container_lowest` and add a 2px "Ghost Border" using the `primary` color at 40% opacity.

---

## 6. Do’s and Don'ts

### Do
*   **Do** use asymmetrical layouts. Place a headline on the left and a floating card partially overlapping a section boundary on the right.
*   **Do** use the full spectrum of Emerald and Amethyst to categorize content.
*   **Do** use generous white space. If you think there is enough padding, add 8px more.

### Don't
*   **Don't** use black (#000000) for text. Use `on_surface` (#2b2a51) to keep the palette sophisticated and soft.
*   **Don't** use 1px dividers to separate content. It breaks the "Editorial" flow and makes the app look like a legacy banking tool.
*   **Don't** use sharp corners. Everything should feel "held" and ergonomic.