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
  setProviderKey: (id: ProviderKeyId, value: string) => void;
  setProviderKeys: (partial: Partial<UserProviderKeys>) => void;
  setModel: (slot: keyof ModelConfig, value: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      providerKeys: emptyProviderKeys(),
      models: normalizeModelConfig(null),
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
        };
      },
    }
  )
);
