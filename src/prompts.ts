export function buildRefinementPrompt(input: {
  userQuestion: string;
  draft: string;
  ownFirstAnswer: string;
  providerLabel: string;
}): string {
  const { userQuestion, draft, ownFirstAnswer, providerLabel } = input;
  return `You are improving an answer that was assembled from multiple AI assistants.

User question:
${userQuestion}

Current draft (improve this):
${draft}

Your own first-pass answer (from ${providerLabel}):
${ownFirstAnswer}

Task:
- Start from the current draft.
- Integrate the best ideas and missing details from your own first-pass answer.
- Fix mistakes, remove contradictions, and keep the result accurate.
- Return ONLY the improved answer text (no preamble).`;
}
