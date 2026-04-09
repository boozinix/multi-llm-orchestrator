# Takeover Rules (From User Requirements)

These are operational rules for any incoming agent taking over this project.

## 1) Output Completeness Rules

- Do exactly what is asked; do not replace requested outputs with summaries.
- If asked for "all code in one file", include real code content, not placeholders.
- Never claim completion when artifact is missing/blank.
- Verify generated files exist and contain expected non-empty content.

## 2) File Generation Rules

- Prefer creating **new, explicit handoff artifacts** rather than overwriting source unless requested.
- Use clear filenames and stable formats (`.md` or `.txt`).
- For concatenated code dumps, include per-file separators:
  - `===== FILE: <relative-path> =====`
- Include all requested file types; clearly state exclusions if any.

## 3) Communication Rules

- Be direct and factual.
- If a previous step was wrong, acknowledge and correct immediately.
- Do not hide partial work behind vague wording.
- When user is frustrated, prioritize immediate correction over explanation.

## 4) Verification Rules

- After generating any major file:
  - check it exists
  - check line count
  - confirm representative sections exist
- Report concrete verification numbers (files included, total lines).

## 5) Handoff/Portability Rules

- Provide tool-agnostic context so any model/IDE can continue.
- Avoid references that only one runtime can interpret.
- Separate:
  1. context,
  2. rules,
  3. plan/progress,
  4. next-agent prompt.

## 6) Project-Specific Behavior Rules

- Preserve BYOK-first behavior and security constraints.
- Treat source files as canonical; generated context files are secondary artifacts.
- Do not alter app behavior unless explicitly requested.

## 7) Quality Rules for Future Tasks

- For large asks, break into deterministic steps and execute all steps.
- Keep an audit trail in generated artifacts (what was done, what remains).
- If user requests exact deliverables count (e.g., 3 files), produce exactly that or more only if requested.

