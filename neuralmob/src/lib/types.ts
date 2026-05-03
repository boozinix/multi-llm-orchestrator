export type BotSlotId = "bot1" | "bot2" | "bot3";

export interface ModelConfig {
  bot1: string;
  bot2: string;
  bot3: string;
  synth: string;
}

export interface FlowConfig {
  mode: "quick" | "chain" | "super";
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
  userEmail: string;
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

export type UserTier = "free" | "paid";

export interface UserRecord {
  id: string;
  email: string;
  tier: UserTier;
  creditBalanceCents: number;
  reservedCreditCents: number;
  lifetimeCalls: number;
  createdAt: number;
}

export interface CreditReservationRecord {
  id: string;
  userId: string;
  reservedCents: number;
  actualCostCents: number | null;
  status: "active" | "settled" | "released";
  createdAt: number;
  finalizedAt: number | null;
}

export interface BillingEventRecord {
  id: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costCents: number;
  createdAt: number;
}

/** Token usage from an LLM completion (actual or estimated). */
export interface CompletionUsage {
  promptTokens: number;
  completionTokens: number;
  /** True when derived from heuristics (API omitted usage). */
  estimated?: boolean;
}

/** One metered upstream model call for billing aggregation. */
export interface UsageLine {
  model: string;
  promptTokens: number;
  completionTokens: number;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}
