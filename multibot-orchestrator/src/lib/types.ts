export type BotSlotId = "bot1" | "bot2" | "bot3";

export interface ModelConfig {
  bot1: string;
  bot2: string;
  bot3: string;
  synth: string;
}

export interface FlowConfig {
  mode: "quick" | "super";
  primarySlot: BotSlotId;
  bot1Enabled: boolean;
  bot2Enabled: boolean;
  bot3Enabled: boolean;
  merge12Enabled: boolean;
  merge123Enabled: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  botOutputs?: BotRunOutput[];
  createdAt: number;
}

export interface BotRunOutput {
  slotId: BotSlotId;
  model: string;
  output: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  flow: FlowConfig;
  models: ModelConfig;
  createdAt: number;
  updatedAt: number;
}

export interface DailyUsage {
  date: string;
  runs: number;
  apiCalls: number;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}
