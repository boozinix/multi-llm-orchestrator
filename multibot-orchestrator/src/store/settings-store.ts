"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeModelConfig } from "@/lib/constants";
import {
  emptyProviderKeys,
  normalizeProviderKeys,
  type UserProviderKeys,
} from "@/lib/provider-keys";
import type { ModelConfig } from "@/lib/types";

export type ProviderKeyId = keyof UserProviderKeys;

interface SettingsState {
  providerKeys: UserProviderKeys;
  models: ModelConfig;
  /** Dev only: when true, prefer OpenRouter (incl. OPENROUTER_API_KEY from .env). */
  useOpenRouterDev: boolean;
  setProviderKey: (id: ProviderKeyId, value: string) => void;
  setProviderKeys: (partial: Partial<UserProviderKeys>) => void;
  setModel: (slot: keyof ModelConfig, value: string) => void;
  setUseOpenRouterDev: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerKeys: emptyProviderKeys(),
      models: normalizeModelConfig(null),
      useOpenRouterDev: true,
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
      setUseOpenRouterDev: (value) => set({ useOpenRouterDev: value }),
    }),
    {
      name: "multibot-settings",
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsState> & { openRouterKey?: string };
        let providerKeys = normalizeProviderKeys(p.providerKeys);
        if (!providerKeys.openrouter && typeof p.openRouterKey === "string" && p.openRouterKey.trim()) {
          providerKeys = { ...providerKeys, openrouter: p.openRouterKey.trim() };
        }
        return {
          ...current,
          providerKeys,
          models: normalizeModelConfig(p.models),
          useOpenRouterDev: typeof p.useOpenRouterDev === "boolean" ? p.useOpenRouterDev : current.useOpenRouterDev,
        };
      },
    }
  )
);
