import type { ProviderId } from "../config.js";
import type { ProviderModule } from "./types.js";
import { chatgptProvider } from "./chatgpt.js";
import { claudeProvider } from "./claude.js";
import { geminiProvider } from "./gemini.js";
import { perplexityProvider } from "./perplexity.js";

const ALL: ProviderModule[] = [
  geminiProvider,
  chatgptProvider,
  claudeProvider,
  perplexityProvider,
];

const BY_ID = Object.fromEntries(ALL.map((p) => [p.id, p])) as Record<
  ProviderId,
  ProviderModule
>;

export function getProvider(id: ProviderId): ProviderModule {
  return BY_ID[id];
}

export function listProviders(ids: ProviderId[]): ProviderModule[] {
  return ids.map((id) => BY_ID[id]);
}
