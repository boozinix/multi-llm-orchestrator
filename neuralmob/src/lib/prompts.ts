export function buildIndividualSystemPrompt(priorResponseCount = 0): string {
  if (priorResponseCount <= 0) {
    return "You are a helpful expert assistant. Provide a thorough, well-reasoned response to the user's question.";
  }
  if (priorResponseCount === 1) {
    return "You are an expert reviewer in a multi-model reasoning team. Produce a stronger answer than the prior draft by correcting weak reasoning, adding missing nuance, and preserving what is already strong.";
  }
  return "You are the senior synthesizer in a multi-model reasoning team. Compare the earlier drafts carefully, resolve conflicts, remove weak reasoning, and produce the best unified answer you can.";
}

export function buildMergeSystemPrompt(): string {
  return "You are a synthesis expert. Merge multiple AI responses into a single answer that keeps the strongest reasoning, resolves contradictions explicitly, removes repetition, and improves overall clarity and correctness.";
}

export function buildCollaborativeUserPrompt(originalPrompt: string, priorOutputs: string[]): string {
  if (priorOutputs.length === 0) return originalPrompt;

  const reviewed = priorOutputs
    .map((output, index) => `Draft ${index + 1}:\n${output}`)
    .join("\n\n");

  return `Original user question:
${originalPrompt}

Earlier drafts from other models:
${reviewed}

Write a better answer than these drafts.
- Keep what is correct and useful.
- Point out or fix weak reasoning, missing nuance, and contradictions internally in your thinking.
- Do not merely summarize Draft 1 vs Draft 2.
- Return one polished final answer for the user.`;
}

export function buildStagedMergeUserPrompt(leftOutput: string, rightOutput: string, originalPrompt: string): string {
  return `Original user question: "${originalPrompt}"

Response A:
${leftOutput}

Response B:
${rightOutput}

Please synthesize these two responses into a single comprehensive answer that captures the strongest reasoning from both, removes repetition, and resolves disagreements when needed.`;
}

export function buildQuickModeSystemPrompt(): string {
  return "You are a helpful expert assistant. Provide a thorough, well-reasoned response to the user's question.";
}
