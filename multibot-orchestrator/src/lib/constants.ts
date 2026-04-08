import type { FlowConfig, ModelConfig } from "./types";

/** OpenRouter-style IDs; direct keys where supported, else OpenRouter. */
export const OPENROUTER_MODELS = [
  // Anthropic
  { value: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5 — 🥇 Flagship" },
  { value: "anthropic/claude-opus-4", label: "Claude 4 Opus — 🧠 Deep reasoning" },
  { value: "anthropic/claude-haiku-3-5", label: "Claude 3.5 Haiku — ⚡ Fast/cheap merge" },
  // OpenAI
  { value: "openai/gpt-5", label: "GPT-5 — 🥇 Flagship" },
  { value: "openai/gpt-5.1", label: "GPT-5.1 — 🔁 Latest iteration" },
  { value: "openai/gpt-4.1", label: "GPT-4.1 — 🔒 Reliable fallback" },
  // xAI
  { value: "x-ai/grok-3", label: "Grok 3 — 🥇 Flagship" },
  { value: "x-ai/grok-3-mini", label: "Grok 3 Mini — ⚡ Fast" },
  // Google
  { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro — 🥇 Flagship" },
  { value: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro — 🔒 Stable fallback" },
  { value: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash — ⚡ Fast/cheap merge" },
  // DeepSeek
  { value: "deepseek/deepseek-chat", label: "DeepSeek V3 — 💰 Cheap + analytical" },
  { value: "deepseek/deepseek-reasoner", label: "DeepSeek Reasoner — 🧮 Math/logic specialist" },
  // Alibaba (Qwen)
  { value: "qwen/qwen3-235b-a22b", label: "Qwen 3 235B — 🌏 Chinese diversity" },
  { value: "qwen/qwen3-30b-a3b", label: "Qwen 3 30B — ⚡ Cheap Qwen fast" },
  // Moonshot
  { value: "moonshotai/kimi-k2", label: "Kimi K2 — 🧮 Best math/agentic" },
  // Mistral
  { value: "mistralai/mistral-large-3", label: "Mistral Large 3 — 🇪🇺 EU/multilingual" },
  { value: "mistralai/mistral-small-3.1", label: "Mistral Small 3.1 — ⚡ Fast EU fallback" },
];

export const DEFAULT_MODELS: ModelConfig = {
  bot1: "openai/gpt-5",
  bot2: "anthropic/claude-sonnet-4-5",
  bot3: "google/gemini-3.1-pro-preview",
  synth: "anthropic/claude-haiku-3-5",
};

export const DEFAULT_FLOW: FlowConfig = {
  mode: "super",
  primarySlot: "bot1",
  bot1Enabled: true,
  bot2Enabled: true,
  bot3Enabled: true,
  merge12Enabled: true,
  merge123Enabled: true,
};

export function normalizeFlowConfig(input: Partial<FlowConfig> | null | undefined): FlowConfig {
  const d = DEFAULT_FLOW;
  if (!input) return { ...d };
  return {
    mode: input.mode === "quick" || input.mode === "super" ? input.mode : d.mode,
    primarySlot: input.primarySlot === "bot1" || input.primarySlot === "bot2" || input.primarySlot === "bot3" ? input.primarySlot : d.primarySlot,
    bot1Enabled: input.bot1Enabled !== undefined ? Boolean(input.bot1Enabled) : d.bot1Enabled,
    bot2Enabled: input.bot2Enabled !== undefined ? Boolean(input.bot2Enabled) : d.bot2Enabled,
    bot3Enabled: input.bot3Enabled !== undefined ? Boolean(input.bot3Enabled) : d.bot3Enabled,
    merge12Enabled: input.merge12Enabled !== undefined ? Boolean(input.merge12Enabled) : d.merge12Enabled,
    merge123Enabled: input.merge123Enabled !== undefined ? Boolean(input.merge123Enabled) : d.merge123Enabled,
  };
}

const ALLOWED_MODEL_VALUES = new Set(OPENROUTER_MODELS.map((m) => m.value));

export function normalizeModelConfig(input: Partial<ModelConfig> | null | undefined): ModelConfig {
  const d = DEFAULT_MODELS;
  if (!input) return { ...d };
  const pick = (v: string | undefined, fallback: string) =>
    v && typeof v === "string" && ALLOWED_MODEL_VALUES.has(v) ? v : fallback;
  return {
    bot1: pick(input.bot1, d.bot1),
    bot2: pick(input.bot2, d.bot2),
    bot3: pick(input.bot3, d.bot3),
    synth: pick(input.synth, d.synth),
  };
}

export const GROUPED_MODELS = [
  { group: "Anthropic", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("anthropic/")) },
  { group: "OpenAI", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("openai/")) },
  { group: "xAI", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("x-ai/")) },
  { group: "Google", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("google/")) },
  { group: "DeepSeek", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("deepseek/")) },
  { group: "Alibaba (Qwen)", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("qwen/")) },
  { group: "Moonshot", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("moonshotai/")) },
  { group: "Mistral", models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("mistralai/")) },
];

export function modelLabel(value: string): string {
  return OPENROUTER_MODELS.find((m) => m.value === value)?.label ?? value.split("/").pop() ?? value;
}
