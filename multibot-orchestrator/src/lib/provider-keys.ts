import type { FlowConfig, ModelConfig } from "./types";

/** Keys the user enters in Settings (browser localStorage). Sent only with /api/chat. */
export type UserProviderKeys = {
  openai: string;
  anthropic: string;
  xai: string;
  deepseek: string;
  openrouter: string;
};

export type ProviderName = "openai" | "anthropic" | "xai" | "deepseek" | "openrouter";

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  xai: "xAI",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
};

export function emptyProviderKeys(): UserProviderKeys {
  return { openai: "", anthropic: "", xai: "", deepseek: "", openrouter: "" };
}

export function normalizeProviderKeys(input: unknown): UserProviderKeys {
  const e = emptyProviderKeys();
  if (!input || typeof input !== "object") return e;
  const o = input as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    openai: s(o.openai) || e.openai,
    anthropic: s(o.anthropic) || e.anthropic,
    xai: s(o.xai) || e.xai,
    deepseek: s(o.deepseek) || e.deepseek,
    openrouter: s(o.openrouter) || e.openrouter,
  };
}

function isByokOnlyMode(): boolean {
  const raw = (process.env.BYOK_ONLY ?? "").trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  // Safe production default: use user-provided keys only unless explicitly disabled.
  return process.env.NODE_ENV === "production";
}

/** Map model id (e.g. openai/gpt-5) to which user key bucket is required. */
export function providerForModelId(modelId: string): ProviderName {
  const prefix = modelId.split("/")[0];
  switch (prefix) {
    case "openai":
      return "openai";
    case "anthropic":
      return "anthropic";
    case "x-ai":
      return "xai";
    case "deepseek":
      return "deepseek";
    case "google":
    case "qwen":
    case "moonshotai":
    case "mistralai":
      return "openrouter";
    default:
      return "openrouter";
  }
}

/** Resolve key for a provider: user key first, then optional server env (local dev). */
export function resolvedKeyForProvider(keys: UserProviderKeys, provider: ProviderName): string {
  const u = keys[provider]?.trim() ?? "";
  if (u) return u;
  if (isByokOnlyMode()) return "";
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY?.trim() ?? "";
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY?.trim() ?? "";
    case "xai":
      return process.env.XAI_API_KEY?.trim() ?? "";
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY?.trim() ?? "";
    case "openrouter":
      return process.env.OPENROUTER_API_KEY?.trim() ?? "";
    default:
      return "";
  }
}

/**
 * Model IDs that will be invoked for this flow (so we can validate keys before any LLM call).
 */
export function modelsRequiredForFlow(flow: FlowConfig, models: ModelConfig): string[] {
  const set = new Set<string>();
  if (flow.mode === "quick") {
    set.add(models[flow.primarySlot]);
    return [...set];
  }
  const slots = (["bot1", "bot2", "bot3"] as const).filter((s) => flow[`${s}Enabled`]);
  for (const s of slots) set.add(models[s]);
  const n = slots.length;
  const synthNeeded =
    n >= 2 ||
    (flow.merge12Enabled && flow.bot1Enabled && flow.bot2Enabled) ||
    (flow.merge123Enabled && flow.bot3Enabled && (flow.bot1Enabled || flow.bot2Enabled));
  if (synthNeeded) set.add(models.synth);
  return [...set];
}

export type MissingKeyError = { modelId: string; provider: ProviderName; label: string };

export function findMissingProviderKeys(
  flow: FlowConfig,
  models: ModelConfig,
  keys: UserProviderKeys
): MissingKeyError[] {
  const required = modelsRequiredForFlow(flow, models);
  const providersNeeded = new Set<ProviderName>();
  for (const modelId of required) {
    providersNeeded.add(providerForModelId(modelId));
  }
  const missing: MissingKeyError[] = [];
  for (const provider of providersNeeded) {
    if (resolvedKeyForProvider(keys, provider)) continue;
    const exampleModel = required.find((m) => providerForModelId(m) === provider) ?? "";
    missing.push({
      modelId: exampleModel,
      provider,
      label: PROVIDER_LABELS[provider],
    });
  }
  return missing;
}

export function formatMissingKeysMessage(missing: MissingKeyError[]): string {
  if (missing.length === 0) return "";
  const parts = missing.map((m) => `${m.label} (e.g. ${m.modelId})`);
  const labels = [...new Set(missing.map((m) => m.label))];
  return `Missing API key for ${labels.join(" and ")}: ${parts.join("; ")}. Open Settings and paste your key.`;
}
