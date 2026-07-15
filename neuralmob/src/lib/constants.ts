import type { FlowConfig, ModelConfig } from "./types";

export type ModelTier = "flagship" | "balanced" | "budget" | "experimental";

export type ModelOption = {
  value: string;
  label: string;
  tier: ModelTier;
  reasoningHint?: "always-on" | "optional" | "none";
};

export type PickerModelOption = ModelOption & {
  disabled: boolean;
  displayLabel: string;
};

export type ModelGroup = {
  group: string;
  models: ModelOption[];
};

export type PickerModelGroup = {
  group: string;
  models: PickerModelOption[];
};

/**
 * Legacy → verified aliases. ADDITIVE ONLY — never delete entries or returning users
 * with saved settings will silently reset to defaults.
 * All right-hand-side IDs verified live on OpenRouter /api/v1/models on 2026-07-15.
 * See docs/MODEL_ROSTER_2026-07-15.md.
 */
const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "google/gemini-2.5-pro-preview": "google/gemini-3.5-flash",
  "google/gemini-2.5-flash-preview": "google/gemini-3.1-flash-lite",
  "mistralai/mistral-small-3.1": "mistralai/mistral-medium-3.5",
  "mistralai/mistral-small-3.1-24b-instruct": "mistralai/mistral-medium-3.5",
  "mistralai/mistral-large-3": "mistralai/mistral-medium-3.5",
  "anthropic/claude-sonnet-4-5": "anthropic/claude-sonnet-5",
  "anthropic/claude-opus-4": "anthropic/claude-opus-4.8",
  "anthropic/claude-haiku-3-5": "anthropic/claude-sonnet-5",
  "openai/gpt-5": "openai/gpt-5.6-terra",
  "openai/gpt-5.1": "openai/gpt-5.6-terra",
  "openai/gpt-4.1": "openai/gpt-5.6-luna",
  "x-ai/grok-3": "x-ai/grok-4.5",
  "x-ai/grok-3-mini": "x-ai/grok-4.3",
  "google/gemini-2.5-pro": "google/gemini-3.5-flash",
  "google/gemini-2.5-flash": "google/gemini-3.1-flash-lite",
  "deepseek/deepseek-chat": "z-ai/glm-5.2",
  "deepseek/deepseek-reasoner": "z-ai/glm-5.2",
  "anthropic/claude-opus-4.7": "anthropic/claude-opus-4.8",
  "anthropic/claude-sonnet-4.6": "anthropic/claude-sonnet-5",
  "anthropic/claude-haiku-4.5": "anthropic/claude-sonnet-5",
  "openai/gpt-5.5": "openai/gpt-5.6-sol",
  "openai/gpt-5.4": "openai/gpt-5.6-terra",
  "openai/gpt-5.4-mini": "openai/gpt-5.6-luna",
  "x-ai/grok-4.20": "x-ai/grok-4.5",
  "google/gemini-3.1-pro-preview": "google/gemini-3.5-flash",
  "google/gemini-3.1-flash-lite-preview": "google/gemini-3.1-flash-lite",
  "deepseek/deepseek-v4-pro": "z-ai/glm-5.2",
  "deepseek/deepseek-v4-flash": "minimax/minimax-m3",
  "qwen/qwen3-235b-a22b": "qwen/qwen3.7-max",
  "qwen/qwen3-30b-a3b": "qwen/qwen3.7-plus",
  "moonshotai/kimi-k2": "moonshotai/kimi-k2.7-code",
};

function canonicalModelId(value: string | undefined): string | undefined {
  if (!value) return value;
  return LEGACY_MODEL_ALIASES[value] ?? value;
}

/** Verified 2026-07-15 against https://openrouter.ai/api/v1/models. Re-verify per release. */
export const OPENROUTER_MODELS: ModelOption[] = [
  // Flagship
  { value: "openai/gpt-5.6-sol-pro", label: "GPT-5.6 Sol Pro — 🥇 OpenAI top (Pro)", tier: "flagship", reasoningHint: "always-on" },
  { value: "openai/gpt-5.6-sol", label: "GPT-5.6 Sol — 🥇 OpenAI top", tier: "flagship", reasoningHint: "optional" },
  { value: "anthropic/claude-opus-4.8", label: "Claude Opus 4.8 — 🥇 Anthropic flagship", tier: "flagship", reasoningHint: "optional" },
  { value: "anthropic/claude-fable-5", label: "Claude Fable 5 — 🥇 Anthropic premium", tier: "flagship", reasoningHint: "optional" },
  { value: "x-ai/grok-4.5", label: "Grok 4.5 — 🥇 xAI flagship", tier: "flagship", reasoningHint: "optional" },

  // Balanced
  { value: "openai/gpt-5.6-terra-pro", label: "GPT-5.6 Terra Pro — ⚖️ OpenAI balanced (Pro)", tier: "balanced", reasoningHint: "always-on" },
  { value: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra — ⚖️ OpenAI balanced", tier: "balanced", reasoningHint: "optional" },
  { value: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5 — ⚖️ Anthropic balanced", tier: "balanced", reasoningHint: "optional" },
  { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash — ⚖️ Google balanced", tier: "balanced", reasoningHint: "optional" },
  { value: "x-ai/grok-4.3", label: "Grok 4.3 — ⚖️ 1M context bargain", tier: "balanced", reasoningHint: "optional" },
  { value: "mistralai/mistral-medium-3.5", label: "Mistral Medium 3.5 — ⚖️ 🇪🇺 EU option", tier: "balanced", reasoningHint: "optional" },

  // Budget
  { value: "openai/gpt-5.6-luna-pro", label: "GPT-5.6 Luna Pro — 💰 OpenAI cheap (Pro)", tier: "budget", reasoningHint: "always-on" },
  { value: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna — 💰 OpenAI cheap", tier: "budget", reasoningHint: "optional" },
  { value: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite — 💰 Cheapest Google", tier: "budget", reasoningHint: "optional" },
  { value: "qwen/qwen3.7-plus", label: "Qwen 3.7 Plus — 💰 🌏 Cheap Chinese", tier: "budget", reasoningHint: "optional" },
  { value: "minimax/minimax-m3", label: "MiniMax M3 — 💰 🌏 Cheap + big context", tier: "budget", reasoningHint: "optional" },

  // Experimental / Chinese
  { value: "qwen/qwen3.7-max", label: "Qwen 3.7 Max — 🌏 Alibaba flagship", tier: "experimental", reasoningHint: "optional" },
  { value: "moonshotai/kimi-k2.7-code", label: "Kimi K2.7 Code — 🌏 Code/agentic", tier: "experimental", reasoningHint: "optional" },
  { value: "z-ai/glm-5.2", label: "GLM 5.2 — 🌏 Zhipu", tier: "experimental", reasoningHint: "optional" },
];

export const DEFAULT_MODELS: ModelConfig = {
  bot1: "openai/gpt-5.6-terra",
  bot2: "anthropic/claude-sonnet-5",
  bot3: "google/gemini-3.5-flash",
  synth: "anthropic/claude-opus-4.8",
};

export const DEFAULT_MODELS_FREE_TIER: ModelConfig = {
  bot1: "google/gemini-3.1-flash-lite",
  bot2: "qwen/qwen3.7-plus",
  bot3: "minimax/minimax-m3",
  synth: "google/gemini-3.1-flash-lite",
};

export const DEFAULT_FLOW: FlowConfig = {
  mode: "super",
  primarySlot: "bot1",
  bot1Enabled: true,
  bot2Enabled: true,
  bot3Enabled: true,
  merge12Enabled: true,
  merge123Enabled: true,
  outputMode: "simple",
  reasoningEffort: "medium",
  webSearchEnabled: false,
};

export function normalizeFlowConfig(input: Partial<FlowConfig> | null | undefined): FlowConfig {
  const d = DEFAULT_FLOW;
  if (!input) return { ...d };
  const mode = input.mode === "quick" || input.mode === "chain" || input.mode === "super" ? input.mode : d.mode;
  const primarySlot =
    input.primarySlot === "bot1" || input.primarySlot === "bot2" || input.primarySlot === "bot3"
      ? input.primarySlot
      : d.primarySlot;
  const bot1Enabled = input.bot1Enabled !== undefined ? Boolean(input.bot1Enabled) : d.bot1Enabled;
  const bot2Enabled = input.bot2Enabled !== undefined ? Boolean(input.bot2Enabled) : d.bot2Enabled;
  const bot3Enabled = input.bot3Enabled !== undefined ? Boolean(input.bot3Enabled) : d.bot3Enabled;
  const merge12Enabled =
    (input.merge12Enabled !== undefined ? Boolean(input.merge12Enabled) : d.merge12Enabled) &&
    bot1Enabled &&
    bot2Enabled;
  const merge123Enabled =
    (input.merge123Enabled !== undefined ? Boolean(input.merge123Enabled) : d.merge123Enabled) &&
    merge12Enabled &&
    bot3Enabled;
  const outputMode = input.outputMode === "simple" || input.outputMode === "advanced" ? input.outputMode : d.outputMode;
  const reasoningEffort =
    input.reasoningEffort === "low" || input.reasoningEffort === "medium" || input.reasoningEffort === "high"
      ? input.reasoningEffort
      : d.reasoningEffort;
  const webSearchEnabled = input.webSearchEnabled !== undefined ? Boolean(input.webSearchEnabled) : d.webSearchEnabled;

  return {
    mode,
    primarySlot,
    bot1Enabled,
    bot2Enabled,
    bot3Enabled,
    merge12Enabled,
    merge123Enabled,
    outputMode,
    reasoningEffort,
    webSearchEnabled,
  };
}

const ALLOWED_MODEL_VALUES = new Set(OPENROUTER_MODELS.map((m) => m.value));

export function normalizeModelConfig(input: Partial<ModelConfig> | null | undefined): ModelConfig {
  const d = DEFAULT_MODELS;
  if (!input) return { ...d };
  const pick = (v: string | undefined, fallback: string) =>
    v && typeof v === "string" && ALLOWED_MODEL_VALUES.has(canonicalModelId(v) ?? "") ? canonicalModelId(v)! : fallback;
  return {
    bot1: pick(input.bot1, d.bot1),
    bot2: pick(input.bot2, d.bot2),
    bot3: pick(input.bot3, d.bot3),
    synth: pick(input.synth, d.synth),
  };
}

export function filterGroupedModels(allowed: ReadonlySet<string> | null) {
  if (!allowed) return GROUPED_MODELS;
  return GROUPED_MODELS.map((g) => ({
    ...g,
    models: g.models.filter((m) => allowed.has(m.value)),
  })).filter((g) => g.models.length > 0);
}

export function buildSelectableModelGroups(allowed: ReadonlySet<string> | null): PickerModelGroup[] {
  return GROUPED_MODELS.map((group) => ({
    group: group.group,
    models: group.models.map((model) => {
      const disabled = Boolean(allowed && !allowed.has(model.value));
      return {
        ...model,
        disabled,
        displayLabel: disabled ? `${model.label} — Paid only` : model.label,
      };
    }),
  }));
}

export function clampModelConfigToAllowed(
  models: ModelConfig,
  allowed: ReadonlySet<string>,
  defaults: ModelConfig = DEFAULT_MODELS_FREE_TIER
): ModelConfig {
  const pick = (v: string, fb: string) => (allowed.has(v) ? v : fb);
  return {
    bot1: pick(models.bot1, defaults.bot1),
    bot2: pick(models.bot2, defaults.bot2),
    bot3: pick(models.bot3, defaults.bot3),
    synth: pick(models.synth, defaults.synth),
  };
}

const TIER_ORDER: Record<ModelTier, number> = { flagship: 0, balanced: 1, budget: 2, experimental: 3 };
function byTier(a: ModelOption, b: ModelOption): number {
  return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
}

export const GROUPED_MODELS: ModelGroup[] = [
  { group: "Anthropic", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("anthropic/")).sort(byTier) },
  { group: "OpenAI", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("openai/")).sort(byTier) },
  { group: "xAI", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("x-ai/")).sort(byTier) },
  { group: "Google", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("google/")).sort(byTier) },
  { group: "Alibaba (Qwen)", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("qwen/")).sort(byTier) },
  { group: "Moonshot", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("moonshotai/")).sort(byTier) },
  { group: "Zhipu (Z-AI)", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("z-ai/")).sort(byTier) },
  { group: "MiniMax", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("minimax/")).sort(byTier) },
  { group: "Mistral", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("mistralai/")).sort(byTier) },
];

export function modelLabel(value: string): string {
  const canonical = canonicalModelId(value) ?? value;
  return OPENROUTER_MODELS.find((m) => m.value === canonical)?.label ?? canonical.split("/").pop() ?? canonical;
}

export function modelTier(value: string): ModelTier | undefined {
  const canonical = canonicalModelId(value) ?? value;
  return OPENROUTER_MODELS.find((m) => m.value === canonical)?.tier;
}
