export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type ChatMode = "quick" | "super";

export type BotSlotId = "bot1" | "bot2" | "bot3";

export type FlowSlot = {
  slotId: BotSlotId;
  enabled: boolean;
};

export type FlowConfig = {
  order: BotSlotId[];
  slots: Record<BotSlotId, FlowSlot>;
  merge12Enabled: boolean;
  merge123Enabled: boolean;
};

export type ModelConfig = {
  bot1: string;
  bot2: string;
  bot3: string;
  primary: BotSlotId;
  synthModel: string;
};

export type ConversationRecord = {
  id: string;
  title: string | null;
  flow: FlowConfig;
  models: ModelConfig;
  createdAt: string;
  updatedAt: string;
};

export type BotRunOutput = {
  slotId: BotSlotId;
  model: string;
  output: string;
};
