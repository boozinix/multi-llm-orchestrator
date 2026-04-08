/** USD per 1M tokens (input / output). Fallback when API does not return cost. */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "anthropic/claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "anthropic/claude-opus-4": { input: 15.0, output: 75.0 },
  "anthropic/claude-haiku-3-5": { input: 0.8, output: 4.0 },
  "openai/gpt-5": { input: 2.5, output: 10.0 },
  "openai/gpt-5.1": { input: 2.5, output: 10.0 },
  "openai/gpt-4.1": { input: 2.0, output: 8.0 },
  "google/gemini-3.1-pro-preview": { input: 1.25, output: 5.0 },
  "google/gemini-2.5-pro-preview": { input: 1.25, output: 5.0 },
  "google/gemini-2.5-flash-preview": { input: 0.15, output: 0.6 },
  "deepseek/deepseek-chat": { input: 0.27, output: 1.1 },
  "deepseek/deepseek-reasoner": { input: 0.55, output: 2.19 },
  "qwen/qwen3-235b-a22b": { input: 0.38, output: 1.55 },
  "qwen/qwen3-30b-a3b": { input: 0.1, output: 0.3 },
  "moonshotai/kimi-k2": { input: 0.6, output: 2.5 },
  "mistralai/mistral-large-3": { input: 2.0, output: 6.0 },
  "mistralai/mistral-small-3.1": { input: 0.1, output: 0.3 },
  "x-ai/grok-3": { input: 3.0, output: 15.0 },
  "x-ai/grok-3-mini": { input: 0.3, output: 0.5 },
};

/** Free tier may only use these OpenRouter model IDs. */
export const FREE_MODELS = [
  "deepseek/deepseek-chat",
  "google/gemini-2.5-flash-preview",
  "mistralai/mistral-small-3.1",
] as const;

export const FREE_MODEL_SET = new Set<string>(FREE_MODELS);

/**
 * Estimated charge in USD cents from token counts and list pricing.
 * Rounds half-up to nearest cent.
 */
export function calculateCostCents(modelId: string, promptTokens: number, completionTokens: number): number {
  const p = MODEL_PRICING[modelId];
  if (!p) {
    const cheap = MODEL_PRICING["mistralai/mistral-small-3.1"]!;
    return calculateCostCentsWithRates(promptTokens, completionTokens, cheap.input, cheap.output);
  }
  return calculateCostCentsWithRates(promptTokens, completionTokens, p.input, p.output);
}

function calculateCostCentsWithRates(
  promptTokens: number,
  completionTokens: number,
  inputPerM: number,
  outputPerM: number
): number {
  const usd = (promptTokens * inputPerM) / 1_000_000 + (completionTokens * outputPerM) / 1_000_000;
  return Math.round(usd * 100);
}
