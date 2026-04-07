"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_MODELS } from "@/lib/constants";
import type { ModelConfig } from "@/lib/types";

type SettingsState = {
  openRouterKey: string;
  models: ModelConfig;
  setOpenRouterKey: (value: string) => void;
  setModelForSlot: (slot: "bot1" | "bot2" | "bot3", model: string | null) => void;
  setPrimarySlot: (slot: "bot1" | "bot2" | "bot3") => void;
  setSynthModel: (model: string | null) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openRouterKey: "",
      models: DEFAULT_MODELS,
      setOpenRouterKey: (value) => set({ openRouterKey: value.trim() }),
      setModelForSlot: (slot, model) => {
        if (!model) return;
        set((state) => ({
          models: {
            ...state.models,
            [slot]: model,
          },
        }));
      },
      setPrimarySlot: (slot) =>
        set((state) => ({
          models: { ...state.models, primary: slot },
        })),
      setSynthModel: (model) => {
        if (!model) return;
        set((state) => ({
          models: { ...state.models, synthModel: model },
        }));
      },
    }),
    {
      name: "multibot-settings",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
