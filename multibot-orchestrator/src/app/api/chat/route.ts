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
import { isShowcaseMode } from "@/lib/server/showcase";
import {
  findMissingProviderKeys,
  formatMissingKeysMessage,
  normalizeProviderKeys,
} from "@/lib/provider-keys";
import type { HistoryMessage } from "@/lib/types";
import { clientSafeModelError } from "@/lib/server/client-safe-error";
import { hitRateLimit } from "@/lib/server/rate-limit";

const KEY_FIELD = z.preprocess(
  (v) => (v == null ? "" : String(v).trim()),
  z.string().max(2048, "API key field too long")
);

const chatSchema = z.object({
  conversationId: z.preprocess((v) => (typeof v === "string" ? v : undefined), z.string().max(128).optional()),
  /** @deprecated Use providerKeys.openrouter */
  apiKey: z.preprocess((v) => (v == null ? "" : String(v)), z.string().max(2048)).optional(),
  providerKeys: z
    .object({
      openai: KEY_FIELD.optional(),
      anthropic: KEY_FIELD.optional(),
      xai: KEY_FIELD.optional(),
      deepseek: KEY_FIELD.optional(),
      openrouter: KEY_FIELD.optional(),
    })
    .optional(),
  prompt: z.preprocess(
    (v) => (v == null ? "" : String(v)),
    z.string().min(1, "Prompt cannot be empty").max(100_000, "Prompt is too long (max 100k characters)")
  ),
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = hitRateLimit(`chat:${email}:${ip}`, 20, 5 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many chat requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { prompt, conversationId: inputConvId, stream: wantsStream } = parsed.data;
  const useStream = wantsStream !== false;

  const showcaseMsg =
    "Showcase mode: this deployment is UI-only. LLM calls are disabled. Set SHOWCASE_MODE=0 and add API keys to run models.";

  if (isShowcaseMode()) {
    if (useStream) {
      const encoder = new TextEncoder();
      const sse = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: showcaseMsg, showcase: true })}\n\n`)
          );
          controller.close();
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
    return NextResponse.json({ error: showcaseMsg, showcase: true }, { status: 403 });
  }

  const flow = normalizeFlowConfig(parsed.data.flow as Record<string, unknown>);
  const models = normalizeModelConfig(parsed.data.models as Record<string, string>);

  let providerKeys = normalizeProviderKeys(parsed.data.providerKeys);
  const legacy = typeof parsed.data.apiKey === "string" ? parsed.data.apiKey.trim() : "";
  if (!providerKeys.openrouter && legacy) {
    providerKeys = { ...providerKeys, openrouter: legacy };
  }

  const missing = findMissingProviderKeys(flow, models, providerKeys);
  if (missing.length > 0) {
    return NextResponse.json({ error: formatMissingKeysMessage(missing) }, { status: 400 });
  }

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

  const orchestratorInput = { providerKeys, flow, models, prompt, history };

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
          send({ type: "error", message: clientSafeModelError(err) });
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
    return NextResponse.json({ error: clientSafeModelError(err) }, { status: 502 });
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
