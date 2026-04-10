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
  "anthropic/claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "anthropic/claude-opus-4": { input: 15.0, output: 75.0 },
  "anthropic/claude-haiku-3-5": { input: 0.8, output: 4.0 },
  "openai/gpt-5": { input: 2.5, output: 10.0 },
  "openai/gpt-5.1": { input: 2.5, output: 10.0 },
  "openai/gpt-4.1": { input: 2.0, output: 8.0 },
  "google/gemini-3.1-pro-preview": { input: 2.0, output: 12.0 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "google/gemini-2.5-pro-preview": { input: 1.25, output: 10.0 },
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-2.5-flash-preview": { input: 0.3, output: 2.5 },
  "deepseek/deepseek-chat": { input: 0.27, output: 1.1 },
  "deepseek/deepseek-reasoner": { input: 0.55, output: 2.19 },
  "qwen/qwen3-235b-a22b": { input: 0.38, output: 1.55 },
  "qwen/qwen3-30b-a3b": { input: 0.1, output: 0.3 },
  "moonshotai/kimi-k2": { input: 0.6, output: 2.5 },
  "mistralai/mistral-large-3": { input: 2.0, output: 6.0 },
  "mistralai/mistral-small-3.1": { input: 0.03, output: 0.11 },
  "mistralai/mistral-small-3.1-24b-instruct": { input: 0.03, output: 0.11 },
  "x-ai/grok-3": { input: 3.0, output: 15.0 },
  "x-ai/grok-3-mini": { input: 0.3, output: 0.5 },
};

/** Free tier may only use these OpenRouter model IDs. */
export const FREE_MODELS = [
  "deepseek/deepseek-chat",
  "x-ai/grok-3-mini",
  "google/gemini-2.5-flash",
  "openai/gpt-4.1",
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
