# NeuralMob — Design Context for Claude Design

## **What is NeuralMob?**

NeuralMob is a **multi-LLM orchestration workspace** — a tool that lets you ask one question and get three AI models (GPT, Claude, Gemini) to reason through it independently, then synthesize their answers together. Think of it as a "debate stage" for AI—you get to see each model's logic, confidence level, and final judgment.

**Core value:** Instead of trusting one model, you get reasoning transparency and stronger answers by comparing three minds in parallel.

---

## **The Product Has 3 Main Pages:**

### **1. Landing Page** (`/`)
- **Purpose**: Marketing + onboarding
- **Sections**:
  - **Hero**: "One prompt in. Independent model reasoning out." (animated title with streaming word reveal)
  - **Three Modes card**: 
    - Quick (1 model, $0.002)
    - Super (3 parallel, $0.009) 
    - Synthesis (Super + attribution, $0.011)
  - **Proof/Truth Table**: Shows 3 models answering the same question (e.g., "What's Anthropic's ARR?"). GPT was right ($100M), Claude hallucinated ($200M), Gemini hedged. Displays confidence scores.
  - **Pricing**: Receipt-style cost breakdown by model
- **Design feel**: Premium, analytical, confidence-inspiring

### **2. Workspace** (`/workspace`) — THE MAIN PRODUCT
- **Purpose**: The actual tool—where users ask questions and watch orchestration happen
- **Layout**: Sidebar (left) + Main area (center/right)

**Sidebar (Left)**:
- NeuralMob logo mark (Fraunces serif branding)
- **History panel**: List of past sessions with relative timestamps ("2h ago", "Yesterday")
- Navigation labels: NAVIGATE, HISTORY (in violet `#d0bcff`)

**Main Area**:
- **Idle state** (before user asks):
  - Greeting: "Good morning, Zubair" (time-aware)
  - 4 prompt suggestion cards (strategy, code review, writing, pricing)
  - "Choose Quick or Super" mode toggle
  
- **Stream state** (while running):
  - **3 vertical lane cards** side-by-side:
    - **Left (Teal)**: GPT response streaming in real-time
    - **Center (Coral)**: Claude response streaming
    - **Right (Violet)**: Gemini response streaming
  - Each lane has a header with model name + color dot
  - Responses are monospaced text, flowing as they arrive
  
  - **Synthesis block** (below lanes):
    - Merged answer (the "judge" model picks the best reasoning)
    - Source attribution (which sentence came from which model)
    - E.g., "[GPT] This is correct because... [Claude] I agree but also... [Gemini] My concern is..."

- **Bottom (Sticky)**: 
  - Composer: Glass panel with textarea + send button
  - "Enter to send, Shift+Enter for new line"

**Design feel**: Clean, technical, emphasizes transparency and speed

### **3. Settings** (`/settings`)
- **Purpose**: Config and billing
- **Sections**:
  - **Provider table**: Add/edit API keys for OpenAI, Anthropic, Google (status indicators)
  - **Routing & Billing grid**: Choose which provider each model hits, set spending limits
  - **Model assignments**: Override default models (e.g., "use Claude 3.5 instead of 4.5")
- **Design feel**: Minimal, utilitarian, scan-friendly table layout

---

## **The Problem We're Solving:**

Currently, the workspace has **janky scroll behavior**. 

**What's broken:**
- Multiple nested scrollable areas fighting each other
- Sidebar and lanes independently scroll (should not)
- Composer at bottom doesn't stick properly
- Feels clunky on big response content

**What we want:**
- Smooth, platform-native scrolling
- **One primary scroll area** (the main content area)
- **Sidebar stays fixed** (never scrolls)
- **Composer sticks to bottom** (visible always, moves up as you scroll)
- **3 lanes scroll together** (not independently)
- Feel polished, responsive, professional

---

## **The Design Constraints (DO NOT CHANGE):**

- ✅ **Colors locked**: Teal `#4edea3`, Coral `#ff8a6b`, Violet `#d0bcff`, Navy `#0b1326`
- ✅ **Layout locked**: Sidebar left, 3-lane center, composer bottom
- ✅ **Typography locked**: Fraunces (headlines), Manrope (body), JetBrains Mono (code)
- ✅ **No structural changes** to pages

**What CAN change (subtle refinements):**
- Hover states (buttons, cards, history items)
- Focus rings on inputs
- Padding/margins (if needed for breathing room)
- Shadow depth (glass effect refinement)
- Animation timing (feels responsive vs. sluggish)
- Scroll smoothness, sticky positioning, overflow rules

---

## **What We're Asking Claude Design To Do:**

1. **Grab the live workspace** (dev server running at localhost:3040)
2. **Identify polish opportunities** (hover states, spacing, scroll behavior)
3. **Fix the scroll issue** — refactor the layout so scrolling feels natural and the composer stays sticky
4. **Return refined HTML** — Updated workspace, landing, settings pages + globals.css
5. **Include implementation notes** — Brief explanation of scroll fix + hover state changes

---

## **Tone we're going for:**
Premium, analytical, minimal but not austere. Tech-forward. Trustworthy.

---

## **Reference:**
- **GitHub repo**: https://github.com/boozinix/multi-llm-orchestrator
- **Production**: https://neuralmob.xyz
- **Branch**: `feature/claude-design-ux`
- **Dev server**: `npm run dev` → http://localhost:3040
