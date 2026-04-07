export function buildIndividualSystemPrompt(): string {
  return "You are a helpful expert assistant. Provide a thorough, well-reasoned response to the user's question.";
}

export function buildMergeSystemPrompt(): string {
  return "You are a synthesis expert. Your task is to merge multiple AI responses into a single, comprehensive, well-structured answer that captures the best insights from all sources. Resolve conflicts with balanced reasoning.";
}

export function buildStagedMergeUserPrompt(leftOutput: string, rightOutput: string, originalPrompt: string): string {
  return `Original user question: "${originalPrompt}"

Response A:
${leftOutput}

Response B:
${rightOutput}

Please synthesize these two responses into a single comprehensive answer that captures the strongest points from both.`;
}

export function buildQuickModeSystemPrompt(): string {
  return "You are a helpful expert assistant. Provide a thorough, well-reasoned response to the user's question.";
}
