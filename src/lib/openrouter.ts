import OpenAI from "openai";
import type { ChatMessage } from "@/lib/types";

type InputMessage = Pick<ChatMessage, "role" | "content">;

export async function runOpenRouterCompletion(input: {
  apiKey: string;
  model: string;
  messages: InputMessage[];
  timeoutMs?: number;
}) {
  const client = new OpenAI({
    apiKey: input.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    timeout: input.timeoutMs ?? 30_000,
  });

  const response = await client.chat.completions.create({
    model: input.model,
    messages: input.messages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error(`No content returned from model ${input.model}.`);
  }
  return content;
}
