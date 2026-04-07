"use client";

import { create } from "zustand";
import { DEFAULT_FLOW } from "@/lib/constants";
import type { BotSlotId, ChatMessage, ChatMode, ConversationRecord, FlowConfig } from "@/lib/types";

type ChatState = {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  mode: ChatMode;
  flow: FlowConfig;
  loading: boolean;
  error: string | null;
  setConversations: (value: ConversationRecord[]) => void;
  setActiveConversationId: (value: string | null) => void;
  setMessages: (value: ChatMessage[]) => void;
  appendMessage: (value: ChatMessage) => void;
  setMode: (value: ChatMode) => void;
  reorderFlow: (order: BotSlotId[]) => void;
  setFlowEnabled: (slotId: BotSlotId, enabled: boolean) => void;
  setMerge12Enabled: (enabled: boolean) => void;
  setMerge123Enabled: (enabled: boolean) => void;
  setFlow: (flow: FlowConfig) => void;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  mode: "super",
  flow: DEFAULT_FLOW,
  loading: false,
  error: null,
  setConversations: (value) => set({ conversations: value }),
  setActiveConversationId: (value) => set({ activeConversationId: value }),
  setMessages: (value) => set({ messages: value }),
  appendMessage: (value) => set((state) => ({ messages: [...state.messages, value] })),
  setMode: (value) => set({ mode: value }),
  reorderFlow: (order) =>
    set((state) => ({
      flow: { ...state.flow, order },
    })),
  setFlowEnabled: (slotId, enabled) =>
    set((state) => ({
      flow: {
        ...state.flow,
        slots: {
          ...state.flow.slots,
          [slotId]: {
            ...state.flow.slots[slotId],
            enabled,
          },
        },
      },
    })),
  setMerge12Enabled: (enabled) =>
    set((state) => ({
      flow: {
        ...state.flow,
        merge12Enabled: enabled,
      },
    })),
  setMerge123Enabled: (enabled) =>
    set((state) => ({
      flow: {
        ...state.flow,
        merge123Enabled: enabled,
      },
    })),
  setFlow: (flow) => set({ flow }),
  setLoading: (value) => set({ loading: value }),
  setError: (value) => set({ error: value }),
}));
