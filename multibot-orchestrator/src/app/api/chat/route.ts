import { NextRequest, NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { z } from "zod";
import { normalizeFlowConfig, normalizeModelConfig } from "@/lib/constants";
import { estimateApiCalls } from "@/lib/limits";
import {
  getConversation,
  createConversation,
  upsertConversationState,
  addMessage,
  getMessages,
  updateConversationTitle,
  reserveDailyUsage,
} from "@/lib/db/queries";
import { runQuickOrchestrator, runSuperOrchestrator } from "@/lib/server/orchestrator";
import { runQuickOrchestratorStream, runSuperOrchestratorStream } from "@/lib/server/orchestrator-stream";
import type { StreamEvent } from "@/lib/server/orchestrator-stream";
import { hasAnyProviderEnvKey, resolvePassthroughApiKey } from "@/lib/server/api-keys";
import type { HistoryMessage } from "@/lib/types";

const chatSchema = z.object({
  conversationId: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().optional()),
  apiKey: z.preprocess((v) => (v == null ? "" : String(v)), z.string()),
  prompt: z.preprocess((v) => (v == null ? "" : String(v)), z.string().min(1, "Prompt cannot be empty")),
  flow: z.record(z.string(), z.unknown()).optional(),
  models: z.record(z.string(), z.preprocess((v) => (v == null ? "" : String(v)), z.string())).optional(),
  stream: z
    .preprocess((v) => (v === false || v === "false" ? false : true), z.boolean())
    .optional()
    .default(true),
});

export async function POST(req: NextRequest) {
  const email = await requireSessionEmail();
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const clientKey = parsed.data.apiKey;
  const apiKey = resolvePassthroughApiKey(clientKey);
  const { prompt, conversationId: inputConvId, stream: wantsStream } = parsed.data;
  const useStream = wantsStream !== false;

  if (!apiKey && !hasAnyProviderEnvKey()) {
    return NextResponse.json(
      {
        error:
          "No API keys configured. Add keys in multibot-orchestrator/.env.local (OPENAI_API_KEY, GEMINI_API_KEY, etc.) or paste a key in Settings.",
      },
      { status: 400 }
    );
  }

  const flow = normalizeFlowConfig(parsed.data.flow as Record<string, unknown>);
  const models = normalizeModelConfig(parsed.data.models as Record<string, string>);
  const apiCallsNeeded = estimateApiCalls(flow);

  const reserved = reserveDailyUsage(1, apiCallsNeeded);
  if (!reserved) {
    return NextResponse.json({ error: "Daily limit reached. Please try again tomorrow." }, { status: 429 });
  }

  let convId = inputConvId;
  if (!convId) {
    const conv = createConversation(flow, models);
    convId = conv.id;
  } else {
    const existing = getConversation(convId);
    if (!existing) {
      const conv = createConversation(flow, models);
      convId = conv.id;
    } else {
      upsertConversationState(convId, flow, models);
    }
  }

  addMessage(convId, "user", prompt);

  const existingMessages = getMessages(convId);
  const history: HistoryMessage[] = existingMessages
    .slice(0, -1)
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));

  const orchestratorInput = { apiKey, flow, models, prompt, history };

  if (useStream) {
    const encoder = new TextEncoder();
    const sse = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: StreamEvent | { type: "done" | "error"; [k: string]: unknown }) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        try {
          const emit = (e: StreamEvent) => send(e);
          const result =
            flow.mode === "quick"
              ? await runQuickOrchestratorStream(orchestratorInput, emit)
              : await runSuperOrchestratorStream(orchestratorInput, emit);

          addMessage(convId, "assistant", result.finalAnswer, result.botOutputs);
          const allMessages = getMessages(convId);
          if (allMessages.length === 2) {
            const title = prompt.slice(0, 60).trim();
            updateConversationTitle(convId, title || "New Conversation");
          }
          send({
            type: "done",
            conversationId: convId,
            finalAnswer: result.finalAnswer,
            botOutputs: result.botOutputs,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Model call failed";
          send({ type: "error", message: msg });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sse, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  let result;
  try {
    if (flow.mode === "quick") {
      result = await runQuickOrchestrator(orchestratorInput);
    } else {
      result = await runSuperOrchestrator(orchestratorInput);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Model call failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  addMessage(convId, "assistant", result.finalAnswer, result.botOutputs);
  const allMessages = getMessages(convId);
  if (allMessages.length === 2) {
    const title = prompt.slice(0, 60).trim();
    updateConversationTitle(convId, title || "New Conversation");
  }

  return NextResponse.json({
    conversationId: convId,
    finalAnswer: result.finalAnswer,
    botOutputs: result.botOutputs,
  });
}
