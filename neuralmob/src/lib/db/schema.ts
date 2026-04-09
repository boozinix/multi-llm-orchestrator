import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  userEmail: text("user_email").notNull(),
  title: text("title").notNull().default("New Conversation"),
  flow: text("flow").notNull(),
  models: text("models").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  botOutputs: text("bot_outputs"),
  createdAt: integer("created_at").notNull(),
});

export const dailyUsage = sqliteTable("daily_usage", {
  date: text("date").primaryKey(),
  runs: integer("runs").notNull().default(0),
  apiCalls: integer("api_calls").notNull().default(0),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  tier: text("tier", { enum: ["free", "paid"] }).notNull().default("free"),
  creditBalanceCents: integer("credit_balance_cents").notNull().default(0),
  reservedCreditCents: integer("reserved_credit_cents").notNull().default(0),
  lifetimeCalls: integer("lifetime_calls").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const billingEvents = sqliteTable("billing_events", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  costCents: integer("cost_cents").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const creditReservations = sqliteTable("credit_reservations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  reservedCents: integer("reserved_cents").notNull(),
  actualCostCents: integer("actual_cost_cents"),
  status: text("status", { enum: ["active", "settled", "released"] }).notNull().default("active"),
  createdAt: integer("created_at").notNull(),
  finalizedAt: integer("finalized_at"),
});

export const creditTopups = sqliteTable("credit_topups", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  providerSessionId: text("provider_session_id").notNull().unique(),
  amountCents: integer("amount_cents").notNull(),
  provider: text("provider").notNull().default("stripe"),
  status: text("status").notNull().default("completed"),
  createdAt: integer("created_at").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  billingEvents: many(billingEvents),
}));

export const billingEventsRelations = relations(billingEvents, ({ one }) => ({
  user: one(users, {
    fields: [billingEvents.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));
