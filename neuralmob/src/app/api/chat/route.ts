import { NextRequest, NextResponse } from "next/server";
import { requireSessionEmail } from "@/lib/server/session";
import { z } from "zod";
import { normalizeFlowConfig, normalizeModelConfig } from "@/lib/constants";
import { estimateApiCalls } from "@/lib/limits";
import {
  createConversationForUser,
  upsertConversationState,
  addMessage,
  getMessages,
  updateConversationTitle,
  reserveDailyUsage,
  upsertUser,
  incrementLifetimeCalls,
  applyPaidUsage,
  getUserByEmail,
  getConversationForUser,
  reserveCreditsForUser,
  releaseCreditReservation,
} from "@/lib/db/queries";
import { isProductionBillingEnabled, shouldEnforceProductionBilling } from "@/lib/server/billing";
import { isOwnerUnlimitedEmail } from "@/lib/server/owner-unlimited";
import { resolveChatProviderKeys } from "@/lib/server/chat-keys";
import { FREE_MODEL_SET, calculateCostCents, estimateWorstCaseRunReserveCents } from "@/lib/pricing";
import { modelsRequiredForFlow } from "@/lib/provider-keys";
import type { UsageLine } from "@/lib/types";
import { runQuickOrchestrator, runSuperOrchestrator } from "@/lib/server/orchestrator";
import { runQuickOrchestratorStream, runSuperOrchestratorStream } from "@/lib/server/orchestrator-stream";
import type { StreamEvent } from "@/lib/server/orchestrator-stream";
import { isShowcaseMode } from "@/lib/server/showcase";
import {
  findMissingProviderKeys,
  formatMissingKeysMessage,
  normalizeProviderKeys,
  resolvedKeyForProvider,
  PROVIDER_LABELS,
  type MissingKeyError,
} from "@/lib/provider-keys";
import type { HistoryMessage } from "@/lib/types";
import { clientSafeModelError } from "@/lib/server/client-safe-error";
import { hitRateLimit } from "@/lib/server/rate-limit";

const KEY_FIELD = z.preprocess(
  (v) => (v == null ? "" : String(v).trim()),
  z.string().max(2048, "API key field too long")
);

const chatSchema = z.object({
  /** Dev-only: when "direct", prefer .env provider keys over OpenRouter (ignored in production). */
  devRouting: z.enum(["openrouter", "direct"]).optional(),
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

  const userRow = await upsertUser(email);

  if (shouldEnforceProductionBilling(email)) {
    if (userRow.tier === "free") {
      const requiredModels = modelsRequiredForFlow(flow, models);
      for (const m of requiredModels) {
        if (!FREE_MODEL_SET.has(m)) {
          return NextResponse.json(
            {
              error: "model_not_allowed",
              message: "This model requires a paid plan.",
              model: m,
            },
            { status: 403 }
          );
        }
      }
    }
    const availableCreditCents = userRow.creditBalanceCents - userRow.reservedCreditCents;
    if (availableCreditCents <= 0) {
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message:
            userRow.tier === "free"
              ? "Your free starter credit is exhausted. Top up to continue."
              : "Your credits are exhausted. Top up to continue.",
        },
        { status: 402 }
      );
    }
  }

  let providerKeys = normalizeProviderKeys(parsed.data.providerKeys);
  const legacy = typeof parsed.data.apiKey === "string" ? parsed.data.apiKey.trim() : "";
  if (!providerKeys.openrouter && legacy) {
    providerKeys = { ...providerKeys, openrouter: legacy };
  }

  providerKeys = resolveChatProviderKeys({
    fromClient: providerKeys,
    devRouting: process.env.NODE_ENV === "development" ? parsed.data.devRouting : undefined,
  });

  const forceOpenRouter =
    process.env.NODE_ENV === "production" || parsed.data.devRouting !== "direct";

  const missing: MissingKeyError[] = forceOpenRouter
    ? resolvedKeyForProvider(providerKeys, "openrouter")
      ? []
      : [
          {
            modelId: "openrouter",
            provider: "openrouter",
            label: PROVIDER_LABELS.openrouter,
          },
        ]
    : findMissingProviderKeys(flow, models, providerKeys);
  if (missing.length > 0) {
    return NextResponse.json({ error: formatMissingKeysMessage(missing) }, { status: 400 });
  }

  const apiCallsNeeded = estimateApiCalls(flow);

  const reserved = isProductionBillingEnabled() ? true : await reserveDailyUsage(1, apiCallsNeeded);
  if (!reserved) {
    return NextResponse.json({ error: "Daily limit reached. Please try again tomorrow." }, { status: 429 });
  }

  let convId = inputConvId;
  if (!convId) {
    const conv = await createConversationForUser(email, flow, models);
    convId = conv.id;
  } else {
    const existing = await getConversationForUser(convId, email);
    if (!existing) {
      const conv = await createConversationForUser(email, flow, models);
      convId = conv.id;
    } else {
      await upsertConversationState(convId, flow, models);
    }
  }

  await addMessage(convId, "user", prompt);

  const existingMessages = await getMessages(convId);
  const history: HistoryMessage[] = existingMessages
    .slice(0, -1)
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));

  let reservationId: string | null = null;
  if (shouldEnforceProductionBilling(email)) {
    const reserveCents = estimateWorstCaseRunReserveCents(flow, models, prompt, history);
    const reservation = await reserveCreditsForUser(userRow.id, reserveCents);
    if (!reservation) {
      const availableCreditCents = Math.max(0, userRow.creditBalanceCents - userRow.reservedCreditCents);
      return NextResponse.json(
        {
          error: "insufficient_credits",
          message:
            availableCreditCents <= 0
              ? "You do not have enough credit to start this run."
              : `You need at least $${(reserveCents / 100).toFixed(2)} available to run this request safely.`,
          required_credit_cents: reserveCents,
          available_credit_cents: availableCreditCents,
        },
        { status: 402 }
      );
    }
    reservationId = reservation.id;
  }

  const orchestratorInput = { providerKeys, flow, models, prompt, history, forceOpenRouter };

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

          await addMessage(convId, "assistant", result.finalAnswer, result.botOutputs);
          const allMessages = await getMessages(convId);
          if (allMessages.length === 2) {
            const title = prompt.slice(0, 60).trim();
            await updateConversationTitle(convId, title || "New Conversation");
          }
          const remainingBalanceCents = await settleUsageAfterSuccessfulRun(
            email,
            userRow.id,
            reservationId,
            result.usageLines
          );
          send({
            type: "done",
            conversationId: convId,
            finalAnswer: result.finalAnswer,
            botOutputs: result.botOutputs,
            remainingBalanceCents,
            owner_unlimited: isOwnerUnlimitedEmail(email),
          });
        } catch (err) {
          if (reservationId) {
            await releaseCreditReservation(userRow.id, reservationId);
          }
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
    if (reservationId) {
      await releaseCreditReservation(userRow.id, reservationId);
    }
    return NextResponse.json({ error: clientSafeModelError(err) }, { status: 502 });
  }

  await addMessage(convId, "assistant", result.finalAnswer, result.botOutputs);
  const allMessages = await getMessages(convId);
  if (allMessages.length === 2) {
    const title = prompt.slice(0, 60).trim();
    await updateConversationTitle(convId, title || "New Conversation");
  }

  const remainingBalanceCents = await settleUsageAfterSuccessfulRun(
    email,
    userRow.id,
    reservationId,
    result.usageLines
  );

  return NextResponse.json({
    conversationId: convId,
    finalAnswer: result.finalAnswer,
    botOutputs: result.botOutputs,
    remainingBalanceCents,
    owner_unlimited: isOwnerUnlimitedEmail(email),
  });
}

async function settleUsageAfterSuccessfulRun(
  userEmail: string,
  userId: string,
  reservationId: string | null,
  usageLines: UsageLine[]
): Promise<number> {
  if (isOwnerUnlimitedEmail(userEmail)) {
    return (await getUserByEmail(userEmail))?.creditBalanceCents ?? 0;
  }
  if (!isProductionBillingEnabled()) {
    return (await getUserByEmail(userEmail))?.creditBalanceCents ?? 0;
  }
  const lines = usageLines.map((l) => ({
    model: l.model,
    promptTokens: l.promptTokens,
    completionTokens: l.completionTokens,
    costCents: calculateCostCents(l.model, l.promptTokens, l.completionTokens),
  }));
  const { newBalanceCents } = await applyPaidUsage(userId, reservationId, lines);
  await incrementLifetimeCalls(userId);
  return newBalanceCents;
}
