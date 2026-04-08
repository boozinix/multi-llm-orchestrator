"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { normalizeFlowConfig } from "@/lib/constants";
import type { ConversationRecord, ChatMessage, FlowConfig } from "@/lib/types";

interface ChatState {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  flow: FlowConfig;
  isLoading: boolean;

  setConversations: (convs: ConversationRecord[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  appendMessage: (msg: ChatMessage) => void;
  setFlow: (flow: Partial<FlowConfig>) => void;
  setLoading: (v: boolean) => void;
  addOrUpdateConversation: (conv: ConversationRecord) => void;
  removeConversation: (id: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      messages: [],
      flow: normalizeFlowConfig(null),
      isLoading: false,

      setConversations: (convs) => set({ conversations: convs }),
      setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),
      setMessages: (msgs) => set({ messages: msgs }),
      appendMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      setFlow: (partial) =>
        set((s) => ({ flow: normalizeFlowConfig({ ...s.flow, ...partial }) })),
      setLoading: (v) => set({ isLoading: v }),
      addOrUpdateConversation: (conv) =>
        set((s) => {
          const idx = s.conversations.findIndex((c) => c.id === conv.id);
          if (idx === -1) return { conversations: [conv, ...s.conversations] };
          const updated = [...s.conversations];
          updated[idx] = conv;
          return { conversations: updated };
        }),
      removeConversation: (id) =>
        set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
    }),
    {
      name: "multibot-chat",
      partialize: (s) => ({ activeConversationId: s.activeConversationId, flow: s.flow }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ChatState>;
        return {
          ...current,
          activeConversationId: typeof p.activeConversationId === "string" ? p.activeConversationId : null,
          flow: normalizeFlowConfig(p.flow),
        };
      },
    }
  )
);
