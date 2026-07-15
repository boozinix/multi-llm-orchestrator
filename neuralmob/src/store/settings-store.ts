"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeModelConfig } from "@/lib/constants";
import type { ModelConfig, ReasoningEffort } from "@/lib/types";
import {
  emptyProviderKeys,
  normalizeProviderKeys,
  type UserProviderKeys,
} from "@/lib/provider-keys";

export type ProviderKeyId = keyof UserProviderKeys;

interface SettingsState {
  providerKeys: UserProviderKeys;
  models: ModelConfig;
  /** Dev only: when true, prefer OpenRouter (incl. OPENROUTER_API_KEY from .env). */
  useOpenRouterDev: boolean;
  /** Fast=low, Regular=medium, Pro=high. Applied to every model call in a run. */
  reasoningEffort: ReasoningEffort;
  /** When true, appends `:online` to model IDs so OpenRouter grounds answers with web results. Off by default (costs extra). */
  webSearchEnabled: boolean;
  setProviderKey: (id: ProviderKeyId, value: string) => void;
  setProviderKeys: (partial: Partial<UserProviderKeys>) => void;
  setModel: (slot: keyof ModelConfig, value: string) => void;
  setModels: (models: ModelConfig) => void;
  setUseOpenRouterDev: (value: boolean) => void;
  setReasoningEffort: (value: ReasoningEffort) => void;
  setWebSearchEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerKeys: emptyProviderKeys(),
      models: normalizeModelConfig(null),
      useOpenRouterDev: true,
      reasoningEffort: "medium",
      webSearchEnabled: false,
      setProviderKey: (id, value) =>
        set((state) => ({
          providerKeys: { ...state.providerKeys, [id]: value },
        })),
      setProviderKeys: (partial) =>
        set((state) => ({
          providerKeys: { ...state.providerKeys, ...partial },
        })),
      setModel: (slot, value) =>
        set((state) => ({ models: { ...state.models, [slot]: value } })),
      setModels: (models) => set({ models: { ...models } }),
      setUseOpenRouterDev: (value) => set({ useOpenRouterDev: value }),
      setReasoningEffort: (value) => set({ reasoningEffort: value }),
      setWebSearchEnabled: (value) => set({ webSearchEnabled: value }),
    }),
    {
      name: "multibot-settings",
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsState> & { openRouterKey?: string };
        let providerKeys = normalizeProviderKeys(p.providerKeys);
        if (!providerKeys.openrouter && typeof p.openRouterKey === "string" && p.openRouterKey.trim()) {
          providerKeys = { ...providerKeys, openrouter: p.openRouterKey.trim() };
        }
        const reasoningEffort: ReasoningEffort =
          p.reasoningEffort === "low" || p.reasoningEffort === "medium" || p.reasoningEffort === "high"
            ? p.reasoningEffort
            : current.reasoningEffort;
        return {
          ...current,
          providerKeys,
          models: normalizeModelConfig(p.models),
          useOpenRouterDev: typeof p.useOpenRouterDev === "boolean" ? p.useOpenRouterDev : current.useOpenRouterDev,
          reasoningEffort,
          webSearchEnabled: typeof p.webSearchEnabled === "boolean" ? p.webSearchEnabled : current.webSearchEnabled,
        };
      },
    }
  )
);
