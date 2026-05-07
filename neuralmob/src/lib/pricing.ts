import {
  buildFinalJudgeSystemPrompt,
  buildFinalJudgeUserPrompt,
  buildIndependentSystemPrompt,
  buildMerge12SystemPrompt,
  buildMerge12UserPrompt,
  buildQuickModeSystemPrompt,
} from "./prompts";
import { MODEL_MAX_OUTPUT_TOKENS, RUN_COST_SAFETY_MULTIPLIER } from "./limits";
import type { FlowConfig, HistoryMessage, ModelConfig } from "./types";

/** USD per 1M tokens (input / output). Fallback when API does not return cost. */
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic
  "anthropic/claude-opus-4.7": { input: 5.0, output: 25.0 },
  "anthropic/claude-sonnet-4.6": { input: 3.0, output: 15.0 },
  "anthropic/claude-haiku-4.5": { input: 1.0, output: 5.0 },
  // OpenAI
  "openai/gpt-5.5": { input: 5.0, output: 30.0 },
  "openai/gpt-5.4": { input: 2.5, output: 15.0 },
  "openai/gpt-5.4-mini": { input: 0.75, output: 4.5 },
  // xAI
  "x-ai/grok-4.3": { input: 1.25, output: 2.5 },
  "x-ai/grok-4.20": { input: 1.25, output: 2.5 },
  // Google
  "google/gemini-3.1-pro-preview": { input: 2.0, output: 12.0 },
  "google/gemini-3.1-flash-lite-preview": { input: 0.25, output: 1.5 },
  // DeepSeek
  "deepseek/deepseek-v4-pro": { input: 0.435, output: 0.87 },
  "deepseek/deepseek-v4-flash": { input: 0.14, output: 0.28 },
  // Alibaba (Qwen)
  "qwen/qwen3-235b-a22b": { input: 0.38, output: 1.55 },
  "qwen/qwen3-30b-a3b": { input: 0.1, output: 0.3 },
  // Moonshot
  "moonshotai/kimi-k2": { input: 0.6, output: 2.5 },
  // Mistral
  "mistralai/mistral-large-3": { input: 2.0, output: 6.0 },
  "mistralai/mistral-small-3.1": { input: 0.03, output: 0.11 },
  "mistralai/mistral-small-3.1-24b-instruct": { input: 0.03, output: 0.11 },
};

/** Free tier may only use these OpenRouter model IDs. */
export const FREE_MODELS = [
  "deepseek/deepseek-v4-flash",
  "google/gemini-3.1-flash-lite-preview",
  "openai/gpt-5.4-mini",
  "mistralai/mistral-small-3.1-24b-instruct",
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

function estimatePromptTokensConservative(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3));
}

function estimateCallReserveCents(modelId: string, promptText: string): number {
  const promptTokens = estimatePromptTokensConservative(promptText);
  return calculateCostCents(modelId, promptTokens, MODEL_MAX_OUTPUT_TOKENS);
}

export function estimateWorstCaseRunReserveCents(
  flow: FlowConfig,
  models: ModelConfig,
  prompt: string,
  history: HistoryMessage[]
): number {
  const historyText = history.map((h) => `${h.role}: ${h.content}`).join("\n");
  const basePrompt = `${historyText}\n${prompt}`.trim();

  if (flow.mode === "quick") {
    const reserve = estimateCallReserveCents(
      models[flow.primarySlot],
      `${buildQuickModeSystemPrompt()}\n${basePrompt}`
    );
    return Math.max(1, Math.ceil(reserve * RUN_COST_SAFETY_MULTIPLIER));
  }

  const enabledSlots = (["bot1", "bot2", "bot3"] as const).filter((slot) => flow[`${slot}Enabled`]);
  let reserve = 0;

  for (let index = 0; index < enabledSlots.length; index++) {
    const slot = enabledSlots[index];
    reserve += estimateCallReserveCents(models[slot], `${buildIndependentSystemPrompt(index + 1)}\n${basePrompt}`);
  }

  const maxSyntheticOutput = "X".repeat(MODEL_MAX_OUTPUT_TOKENS * 4);

  if (flow.merge12Enabled && flow.bot1Enabled && flow.bot2Enabled) {
    const merge12Prompt = buildMerge12UserPrompt(prompt, maxSyntheticOutput, maxSyntheticOutput);
    reserve += estimateCallReserveCents(models.synth, `${buildMerge12SystemPrompt()}\n${merge12Prompt}`);
  }

  if (flow.merge123Enabled && flow.bot3Enabled && (flow.bot1Enabled || flow.bot2Enabled)) {
    const finalJudgePrompt = buildFinalJudgeUserPrompt(prompt, maxSyntheticOutput, maxSyntheticOutput);
    reserve += estimateCallReserveCents(models.synth, `${buildFinalJudgeSystemPrompt()}\n${finalJudgePrompt}`);
  }

  return Math.max(1, Math.ceil(reserve * RUN_COST_SAFETY_MULTIPLIER));
}
