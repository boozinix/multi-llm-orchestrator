import type { FlowConfig, ModelConfig } from "./types";

export const OPENROUTER_MODELS = [
  // OpenAI
  { value: "openai/o4-mini", label: "OpenAI o4 Mini (latest reasoning)" },
  { value: "openai/o3", label: "OpenAI o3 (reasoning)" },
  { value: "openai/o3-mini", label: "OpenAI o3 Mini" },
  { value: "openai/gpt-4.1", label: "GPT-4.1" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  // Anthropic
  { value: "anthropic/claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3-5-haiku", label: "Claude 3.5 Haiku" },
  // Google Gemini
  { value: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro (latest preview)" },
  { value: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash (latest preview)" },
  { value: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { value: "google/gemini-2.0-flash-lite-001", label: "Gemini 2.0 Flash Lite" },
  // xAI Grok
  { value: "x-ai/grok-3", label: "Grok 3" },
  { value: "x-ai/grok-3-mini", label: "Grok 3 Mini" },
  { value: "x-ai/grok-2-1212", label: "Grok 2" },
  // DeepSeek
  { value: "deepseek/deepseek-reasoner", label: "DeepSeek Reasoner" },
  { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3 (Mar 2025)" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
];

export const DEFAULT_MODELS: ModelConfig = {
  bot1: "openai/gpt-4o",
  bot2: "anthropic/claude-3-5-sonnet",
  bot3: "google/gemini-2.0-flash-001",
  synth: "openai/gpt-4o",
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

export function normalizeModelConfig(input: Partial<ModelConfig> | null | undefined): ModelConfig {
  const d = DEFAULT_MODELS;
  if (!input) return { ...d };
  return {
    bot1: input.bot1 && typeof input.bot1 === "string" ? input.bot1 : d.bot1,
    bot2: input.bot2 && typeof input.bot2 === "string" ? input.bot2 : d.bot2,
    bot3: input.bot3 && typeof input.bot3 === "string" ? input.bot3 : d.bot3,
    synth: input.synth && typeof input.synth === "string" ? input.synth : d.synth,
  };
}

export const GROUPED_MODELS = [
  {
    group: "OpenAI",
    models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("openai/")),
  },
  {
    group: "Anthropic",
    models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("anthropic/")),
  },
  {
    group: "Google Gemini",
    models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("google/")),
  },
  {
    group: "xAI Grok",
    models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("x-ai/")),
  },
  {
    group: "DeepSeek",
    models: OPENROUTER_MODELS.filter((m) => m.value.startsWith("deepseek/")),
  },
];

export function modelLabel(value: string): string {
  return OPENROUTER_MODELS.find((m) => m.value === value)?.label ?? value.split("/").pop() ?? value;
}
