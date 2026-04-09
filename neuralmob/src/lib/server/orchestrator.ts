import { callModel } from "../openrouter";
import {
  buildCollaborativeUserPrompt,
  buildIndividualSystemPrompt,
  buildMergeSystemPrompt,
  buildStagedMergeUserPrompt,
  buildQuickModeSystemPrompt,
} from "../prompts";
import type { UserProviderKeys } from "../provider-keys";
import type { FlowConfig, ModelConfig, BotRunOutput, HistoryMessage, UsageLine } from "../types";

export interface OrchestratorInput {
  providerKeys: UserProviderKeys;
  flow: FlowConfig;
  models: ModelConfig;
  prompt: string;
  history: HistoryMessage[];
  /** Dev: when true, route all model slugs through OpenRouter (matches Settings “Use OpenRouter”). */
  forceOpenRouter?: boolean;
}

export interface OrchestratorResult {
  finalAnswer: string;
  botOutputs: BotRunOutput[];
  usageLines: UsageLine[];
}

const MODEL_CALL_TIMEOUT_MS = Number(process.env.MODEL_CALL_TIMEOUT_MS ?? 45000);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function safeCallModel(
  input: OrchestratorInput,
  model: string,
  systemPrompt: string,
  history: HistoryMessage[],
  userPrompt: string
): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number } } | null> {
  try {
    const { text, usage } = await withTimeout(
      callModel(input.providerKeys, model, systemPrompt, history, userPrompt, {
        forceOpenRouter: input.forceOpenRouter,
      }),
      MODEL_CALL_TIMEOUT_MS,
      model
    );
    const trimmed = text.trim();
    if (!trimmed) return null;
    return { text: trimmed, usage };
  } catch (err) {
    console.warn(`[orchestrator] skipping failed model ${model}:`, err);
    return null;
  }
}

async function safeMerge(
  input: OrchestratorInput,
  left: string,
  right: string,
  usageLines: UsageLine[]
): Promise<string | null> {
  const r = await safeCallModel(
    input,
    input.models.synth,
    buildMergeSystemPrompt(),
    [],
    buildStagedMergeUserPrompt(left, right, input.prompt)
  );
  if (!r) return null;
  usageLines.push({
    model: input.models.synth,
    promptTokens: r.usage.promptTokens,
    completionTokens: r.usage.completionTokens,
  });
  return r.text;
}

export async function runQuickOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { providerKeys, flow, models, prompt, history } = input;
  const model = models[flow.primarySlot];
  const { text, usage } = await withTimeout(
    callModel(providerKeys, model, buildQuickModeSystemPrompt(), history, prompt, {
      forceOpenRouter: input.forceOpenRouter,
    }),
    MODEL_CALL_TIMEOUT_MS,
    model
  );
  return {
    finalAnswer: text,
    botOutputs: [{ slotId: flow.primarySlot, model, output: text }],
    usageLines: [{ model, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens }],
  };
}

export async function runSuperOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { flow, models, prompt, history } = input;

  const enabledSlots = (["bot1", "bot2", "bot3"] as const).filter((s) => flow[`${s}Enabled`]);

  if (enabledSlots.length === 0) {
    throw new Error("No bot slots enabled");
  }

  const botOutputs: BotRunOutput[] = [];
  const outputMap: Record<string, string> = {};
  const usageLines: UsageLine[] = [];
  const priorOutputs: string[] = [];

  // Graceful fan-out: if one bot fails (credits, timeout, etc.), continue others.
  for (const slotId of enabledSlots) {
    const model = models[slotId];
    const got = await safeCallModel(
      input,
      model,
      buildIndividualSystemPrompt(priorOutputs.length),
      history,
      buildCollaborativeUserPrompt(prompt, priorOutputs)
    );
    if (!got) continue;
    botOutputs.push({ slotId, model, output: got.text });
    outputMap[slotId] = got.text;
    priorOutputs.push(got.text);
    usageLines.push({ model, promptTokens: got.usage.promptTokens, completionTokens: got.usage.completionTokens });
  }

  if (botOutputs.length === 0) {
    throw new Error("All enabled model calls failed. Check provider keys/credits and try again.");
  }

  const bot1Out = outputMap["bot1"];
  const bot2Out = outputMap["bot2"];
  const bot3Out = outputMap["bot3"];

  let finalAnswer: string;

  const hasMerge12 = flow.merge12Enabled && bot1Out && bot2Out;
  const hasMerge123 = flow.merge123Enabled && bot3Out;

  if (hasMerge12 && hasMerge123) {
    const combined12 = await safeMerge(input, bot1Out, bot2Out, usageLines);
    if (combined12) {
      const merged123 = await safeMerge(input, combined12, bot3Out, usageLines);
      finalAnswer = merged123 ?? combined12;
    } else {
      finalAnswer = bot1Out;
      if (bot2Out) finalAnswer = bot2Out;
      if (bot3Out) finalAnswer = bot3Out;
    }
  } else if (hasMerge12 && !hasMerge123) {
    const combined12 = await safeMerge(input, bot1Out, bot2Out, usageLines);
    if (bot3Out) {
      if (!combined12) {
        finalAnswer = bot3Out;
      } else {
        finalAnswer = (await safeMerge(input, combined12, bot3Out, usageLines)) ?? combined12;
      }
    } else {
      finalAnswer = combined12 ?? bot1Out ?? bot2Out;
    }
  } else if (!hasMerge12 && hasMerge123 && bot1Out && bot3Out) {
    const left = bot2Out ? (await safeMerge(input, bot1Out, bot2Out, usageLines)) ?? bot1Out : bot1Out;
    finalAnswer = (await safeMerge(input, left, bot3Out, usageLines)) ?? left;
  } else {
    const allOutputs = Object.values(outputMap);
    if (allOutputs.length === 1) {
      finalAnswer = allOutputs[0];
    } else {
      let acc = allOutputs[0];
      for (let i = 1; i < allOutputs.length; i++) {
        const merged = await safeMerge(input, acc, allOutputs[i], usageLines);
        if (merged) acc = merged;
      }
      finalAnswer = acc;
    }
  }

  return { finalAnswer, botOutputs, usageLines };
}
