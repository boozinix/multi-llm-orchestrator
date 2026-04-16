/* ── Query complexity classifier ── */

export type QueryComplexity = "trivial" | "simple" | "complex";

export function classifyQueryComplexity(query: string): QueryComplexity {
  const q = query.trim();
  const words = q.split(/\s+/).length;

  // Trivial: pure math, one/two-word lookups, yes/no, definitions
  const isPureMath = /^[\d\s+\-*/^().=]+$/.test(q);
  if (isPureMath || words <= 2) return "trivial";

  // Complex indicators: analysis keywords, code, long queries
  const hasComplexIndicators =
    /\b(explain|analyze|compare|contrast|evaluate|design|architect|strategy|tradeoff|pros and cons|difference between|how does|why does|what causes|in depth|detailed|comprehensive|implement|debug|refactor|write|create)\b/i.test(q);
  const hasCode = /[{}\[\]()=><]|function|class|const |let |import |```/.test(q);

  if (hasCode || (words > 40 && hasComplexIndicators) || words > 60) return "complex";
  if (words <= 15 && !hasComplexIndicators) return "simple";
  if (hasComplexIndicators) return "complex";

  return "simple";
}

/* ── Tiered bot prompts ── */

export function buildIndependentSystemPrompt(botNumber: number, complexity?: QueryComplexity): string {
  if (complexity === "trivial") {
    return `You are Expert ${botNumber}. Answer directly in as few words as accurate. No preamble, no explanation unless asked.`;
  }
  if (complexity === "simple") {
    return `You are Expert ${botNumber}, one of several independent experts. Answer concisely and accurately. Be direct. Add brief context only where it prevents misunderstanding.`;
  }
  return `You are Expert ${botNumber}, one of several independent experts answering the same question.

Answer independently.
- Do not assume what other experts will say.
- Give your best full answer from scratch.
- Make clear recommendations.
- Show reasoning step by step.
- State assumptions, tradeoffs, risks, and edge cases.
- Be specific, practical, and non-generic.
- Do not hedge excessively or add filler.

Output format:
1. Main answer
2. Reasoning
3. Assumptions, risks, and edge cases
4. Bottom line recommendation`;
}

/* ── Tiered merge prompts ── */

export function buildMerge12SystemPrompt(complexity?: QueryComplexity): string {
  if (complexity === "trivial" || complexity === "simple") {
    return `Pick the best and most accurate answer from the following experts. Output only the answer. No meta-commentary.`;
  }
  return `You are a synthesizer comparing two independent expert answers to the same question.

Your job:
1. Compare the two answers.
2. Identify where they agree and where they meaningfully differ.
3. Find weaknesses, bad assumptions, missing edge cases, and stronger reasoning.
4. Keep the best parts of both.
5. Produce an improved combined answer that is stronger than either answer alone.

Instructions:
- Do not just summarize both answers.
- Resolve disagreements where possible.
- If one expert is clearly better on a point, choose that approach.
- If both are incomplete, improve beyond both.
- Optimize for correctness, robustness, and usefulness.

Output format:
1. Agreement and differences
2. What survives from each answer
3. Improved combined answer
4. Why this version is stronger`;
}

export function buildFinalJudgeSystemPrompt(complexity?: QueryComplexity): string {
  if (complexity === "trivial" || complexity === "simple") {
    return `Compare these answers and output the single best answer. No meta-commentary. Just the answer.`;
  }
  return `You are the final judge comparing an improved combined answer against a third independent expert.

Your job:
1. Compare the combined answer against the third expert.
2. Identify important disagreements, blind spots, and improvements.
3. Decide which reasoning is stronger on each important point.
4. Produce one final answer that preserves the strongest reasoning from all available inputs.

Instructions:
- Do not average the answers mechanically.
- Prefer the most correct, robust, and practical reasoning.
- If the third expert reveals a flaw in the combined answer, fix it.
- If the combined answer is stronger, keep it and only add what improves it.
- Make clear calls. Do not turn this into a meta-discussion.

Output format:
1. Key disagreements
2. Final judgment
3. Final answer
4. Why this answer wins`;
}

export function buildMerge12UserPrompt(originalPrompt: string, leftOutput: string, rightOutput: string): string {
  return `Original question:
${originalPrompt}

Expert 1 answer:
${leftOutput}

Expert 2 answer:
${rightOutput}`;
}

export function buildFinalJudgeUserPrompt(
  originalPrompt: string,
  combinedAnswer: string,
  thirdAnswer: string
): string {
  return `Original question:
${originalPrompt}

Improved combined answer from Experts 1 and 2:
${combinedAnswer}

Expert 3 independent answer:
${thirdAnswer}`;
}

export function buildQuickModeSystemPrompt(complexity?: QueryComplexity): string {
  if (complexity === "trivial") {
    return "Answer directly in as few words as accurate. No preamble.";
  }
  if (complexity === "simple") {
    return "You are a helpful expert assistant. Answer concisely and accurately. Be direct.";
  }
  return "You are a helpful expert assistant. Provide a thorough, well-reasoned response to the user's question.";
}
