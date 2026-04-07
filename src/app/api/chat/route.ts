import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { AUTH_COOKIE_NAME, isAllowedEmail } from "@/lib/auth";
import { DEFAULT_FLOW, DEFAULT_MODELS } from "@/lib/constants";
import { ensureDb } from "@/lib/db/init";
import {
  addConversationMessage,
  getDailyUsage,
  incrementDailyUsage,
  upsertConversationState,
  updateConversationTitleFromFirstMessage,
} from "@/lib/db/queries";
import { DAILY_API_CALL_LIMIT, DAILY_RUN_LIMIT, estimateApiCallsForRequest, getDailyKey } from "@/lib/limits";
import { runOpenRouterCompletion } from "@/lib/openrouter";
import {
  buildIndividualPrompt,
  buildMergePrompt,
  buildQuickModePrompt,
  buildStepMergePrompt,
} from "@/lib/prompts";
import type { BotRunOutput, ChatMessage, BotSlotId } from "@/lib/types";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

const requestSchema = z.object({
  conversationId: z.string().min(1),
  mode: z.enum(["quick", "super"]),
  prompt: z.string().min(1),
  messages: z.array(messageSchema).default([]),
  flow: z.any().optional(),
  models: z.any().optional(),
  openRouterKey: z.string().min(1),
});

function getEnabledFlowOrder(flow: typeof DEFAULT_FLOW) {
  return flow.order.filter((slotId) => flow.slots[slotId].enabled);
}

async function runSuperMode(input: {
  openRouterKey: string;
  flow: typeof DEFAULT_FLOW;
  models: typeof DEFAULT_MODELS;
  prompt: string;
  history: ChatMessage[];
}) {
  const enabledSlots = getEnabledFlowOrder(input.flow);
  if (enabledSlots.length === 0) {
    throw new Error("At least one enabled bot slot is required.");
  }

  const outputs: Partial<Record<BotSlotId, string>> = {};
  const traced: BotRunOutput[] = [];

  for (const slotId of enabledSlots) {
    const model = input.models[slotId];
    const content = await runOpenRouterCompletion({
      apiKey: input.openRouterKey,
      model,
      messages: [
        {
          role: "user",
          content: buildIndividualPrompt({
            modelName: model,
            userPrompt: input.prompt,
            history: input.history,
          }),
        },
      ],
    });
    outputs[slotId] = content;
    traced.push({ slotId, model, output: content });
  }

  const synthModel = input.models.synthModel;
  let combined12 = outputs.bot1 ?? outputs.bot2 ?? "";

  if (input.flow.merge12Enabled && outputs.bot1 && outputs.bot2) {
    combined12 = await runOpenRouterCompletion({
      apiKey: input.openRouterKey,
      model: synthModel,
      messages: [
        {
          role: "user",
          content: buildStepMergePrompt({
            leftLabel: `Bot 1 (${input.models.bot1})`,
            leftText: outputs.bot1,
            rightLabel: `Bot 2 (${input.models.bot2})`,
            rightText: outputs.bot2,
            history: input.history,
          }),
        },
      ],
    });
  }

  let finalAnswer = combined12 || outputs.bot3 || "";
  if (input.flow.merge123Enabled && outputs.bot3 && combined12) {
    finalAnswer = await runOpenRouterCompletion({
      apiKey: input.openRouterKey,
      model: synthModel,
      messages: [
        {
          role: "user",
          content: buildStepMergePrompt({
            leftLabel: "Bot 1+2 Combined",
            leftText: combined12,
            rightLabel: `Bot 3 (${input.models.bot3})`,
            rightText: outputs.bot3,
            history: input.history,
          }),
        },
      ],
    });
  }

  if (!finalAnswer) {
    const fallbackOutputs = traced;
    finalAnswer = await runOpenRouterCompletion({
      apiKey: input.openRouterKey,
      model: synthModel,
      messages: [
        {
          role: "user",
          content: buildMergePrompt({
            outputs: fallbackOutputs,
            history: input.history,
          }),
        },
      ],
    });
  }

  return { finalAnswer, botOutputs: traced };
}

async function runQuickMode(input: {
  openRouterKey: string;
  models: typeof DEFAULT_MODELS;
  prompt: string;
  history: ChatMessage[];
}) {
  const primarySlot = input.models.primary as BotSlotId;
  const selectedModel = input.models[primarySlot];
  const content = await runOpenRouterCompletion({
    apiKey: input.openRouterKey,
    model: selectedModel,
    messages: [
      {
        role: "user",
        content: buildQuickModePrompt({
          selectedModel,
          history: input.history,
          userPrompt: input.prompt,
        }),
      },
    ],
  });
  return {
    finalAnswer: content,
    botOutputs: [{ slotId: primarySlot, model: selectedModel, output: content }],
  };
}

export async function POST(request: Request) {
  ensureDb();
  const sessionEmail = (await cookies()).get(AUTH_COOKIE_NAME)?.value ?? "";
  if (!isAllowedEmail(sessionEmail)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const raw = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const flow = parsed.data.flow ?? DEFAULT_FLOW;
  const models = parsed.data.models ?? DEFAULT_MODELS;
  const history = parsed.data.messages as ChatMessage[];
  const requestedApiCalls = estimateApiCallsForRequest(parsed.data.mode, flow);

  try {
    const day = getDailyKey();
    const usage = await getDailyUsage(day);
    if (usage.runs + 1 > DAILY_RUN_LIMIT) {
      return NextResponse.json(
        { error: `Daily run limit reached (${DAILY_RUN_LIMIT}/${DAILY_RUN_LIMIT}).` },
        { status: 429 },
      );
    }
    if (usage.apiCalls + requestedApiCalls > DAILY_API_CALL_LIMIT) {
      return NextResponse.json(
        {
          error: `Daily API call limit reached (${usage.apiCalls}/${DAILY_API_CALL_LIMIT}). This request needs ${requestedApiCalls} calls.`,
        },
        { status: 429 },
      );
    }

    await upsertConversationState({
      conversationId: parsed.data.conversationId,
      flow,
      models,
    });
    await addConversationMessage({
      conversationId: parsed.data.conversationId,
      role: "user",
      content: parsed.data.prompt,
    });

    const result =
      parsed.data.mode === "super"
        ? await runSuperMode({
            openRouterKey: parsed.data.openRouterKey,
            flow,
            models,
            prompt: parsed.data.prompt,
            history,
          })
        : await runQuickMode({
            openRouterKey: parsed.data.openRouterKey,
            models,
            prompt: parsed.data.prompt,
            history,
          });

    await addConversationMessage({
      conversationId: parsed.data.conversationId,
      role: "assistant",
      content: result.finalAnswer,
    });
    await updateConversationTitleFromFirstMessage(parsed.data.conversationId);
    await incrementDailyUsage({ day, runs: 1, apiCalls: requestedApiCalls });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during chat orchestration.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
