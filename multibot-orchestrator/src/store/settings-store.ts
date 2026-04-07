"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeModelConfig } from "@/lib/constants";
import type { ModelConfig } from "@/lib/types";

interface SettingsState {
  openRouterKey: string;
  models: ModelConfig;
  setOpenRouterKey: (key: string) => void;
  setModel: (slot: keyof ModelConfig, value: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openRouterKey: "",
      models: normalizeModelConfig(null),
      setOpenRouterKey: (key) => set({ openRouterKey: key }),
      setModel: (slot, value) =>
        set((state) => ({ models: { ...state.models, [slot]: value } })),
    }),
    {
      name: "multibot-settings",
      merge: (persisted, current) => {
        const p = persisted as Partial<SettingsState>;
        return {
          ...current,
          openRouterKey: typeof p.openRouterKey === "string" ? p.openRouterKey : "",
          models: normalizeModelConfig(p.models),
        };
      },
    }
  )
);
