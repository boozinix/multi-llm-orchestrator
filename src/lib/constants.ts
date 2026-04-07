import type { FlowConfig, ModelConfig } from "@/lib/types";

export const OPENROUTER_MODELS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "google/gemini-2.0-flash-001",
  "openai/gpt-4o",
];

export const DEFAULT_FLOW: FlowConfig = {
  order: ["bot1", "bot2", "bot3"],
  slots: {
    bot1: { slotId: "bot1", enabled: true },
    bot2: { slotId: "bot2", enabled: true },
    bot3: { slotId: "bot3", enabled: true },
  },
  merge12Enabled: true,
  merge123Enabled: true,
};

export const DEFAULT_MODELS: ModelConfig = {
  bot1: "openai/gpt-4o-mini",
  bot2: "anthropic/claude-3.5-sonnet",
  bot3: "google/gemini-2.0-flash-001",
  primary: "bot1",
  synthModel: "openai/gpt-4o",
};
