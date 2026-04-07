import type { ChatMessage, ConversationRecord, FlowConfig, ModelConfig } from "@/lib/types";

export async function apiListConversations() {
  const response = await fetch("/api/conversations");
  if (!response.ok) throw new Error("Failed to load conversations.");
  const data = await response.json();
  return data.conversations as ConversationRecord[];
}

export async function apiCreateConversation() {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error("Failed to create conversation.");
  const data = await response.json();
  return data.conversation as ConversationRecord;
}

export async function apiLoadConversation(conversationId: string) {
  const response = await fetch(`/api/conversations/${conversationId}`);
  if (!response.ok) throw new Error("Failed to load conversation.");
  return (await response.json()) as {
    conversation: ConversationRecord;
    messages: ChatMessage[];
  };
}

export async function apiSendChat(input: {
  conversationId: string;
  mode: "quick" | "super";
  prompt: string;
  messages: ChatMessage[];
  flow: FlowConfig;
  models: ModelConfig;
  openRouterKey: string;
}) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to run chat flow.");
  }
  return data as { finalAnswer: string };
}
