import { streamModel, estimateUsageFromMessages } from "../openrouter";
import { modelLabel } from "../constants";
import {
  buildIndividualSystemPrompt,
  buildMergeSystemPrompt,
  buildStagedMergeUserPrompt,
  buildQuickModeSystemPrompt,
} from "../prompts";
import type { UserProviderKeys } from "../provider-keys";
import type { BotRunOutput, CompletionUsage, FlowConfig, HistoryMessage, ModelConfig, UsageLine } from "../types";

export type StreamPhase =
  | "quick"
  | "bot1"
  | "bot2"
  | "bot3"
  | "merge12"
  | "merge123"
  | "merge_chain";

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "phase_start"; phase: StreamPhase; label: string }
  | { type: "token"; phase: StreamPhase; delta: string }
  | { type: "phase_end"; phase: StreamPhase; text: string };

interface StreamInput {
  providerKeys: UserProviderKeys;
  flow: FlowConfig;
  models: ModelConfig;
  prompt: string;
  history: HistoryMessage[];
  forceOpenRouter?: boolean;
}

const STREAM_PHASE_TIMEOUT_MS = Number(process.env.STREAM_PHASE_TIMEOUT_MS ?? 45000);

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

function finalizeStreamUsage(
  raw: CompletionUsage | null,
  systemPrompt: string,
  history: HistoryMessage[],
  userPrompt: string,
  output: string
): CompletionUsage {
  if (raw && (raw.promptTokens > 0 || raw.completionTokens > 0)) return raw;
  return estimateUsageFromMessages(systemPrompt, history, userPrompt, output);
}

async function tryRunPhase(
  phase: StreamPhase,
  label: string,
  gen: AsyncGenerator<string, CompletionUsage | null, unknown>,
  emit: (e: StreamEvent) => void,
  ctx: { systemPrompt: string; history: HistoryMessage[]; userPrompt: string }
): Promise<{ text: string; usage: CompletionUsage } | null> {
  try {
    return await withTimeout(runPhase(phase, label, gen, emit, ctx), STREAM_PHASE_TIMEOUT_MS, label);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "model call failed";
    emit({ type: "status", message: `${label} failed, skipping. (${msg})` });
    return null;
  }
}

async function runPhase(
  phase: StreamPhase,
  label: string,
  gen: AsyncGenerator<string, CompletionUsage | null, unknown>,
  emit: (e: StreamEvent) => void,
  ctx: { systemPrompt: string; history: HistoryMessage[]; userPrompt: string }
): Promise<{ text: string; usage: CompletionUsage }> {
  emit({ type: "phase_start", phase, label });
  let full = "";
  const it = gen[Symbol.asyncIterator]();
  while (true) {
    const step = await it.next();
    if (step.done) {
      const usage = finalizeStreamUsage(
        step.value as CompletionUsage | null,
        ctx.systemPrompt,
        ctx.history,
        ctx.userPrompt,
        full
      );
      emit({ type: "phase_end", phase, text: full });
      return { text: full, usage };
    }
    const delta = step.value as string;
    full += delta;
    emit({ type: "token", phase, delta });
  }
}

export async function runQuickOrchestratorStream(
  input: StreamInput,
  emit: (e: StreamEvent) => void
): Promise<{ finalAnswer: string; botOutputs: BotRunOutput[]; usageLines: UsageLine[] }> {
  const { providerKeys, flow, models, prompt, history } = input;
  const orOpts = { forceOpenRouter: input.forceOpenRouter };
  const model = models[flow.primarySlot];
  const label = `Quick — ${modelLabel(model)}`;
  emit({ type: "status", message: `Starting ${label}…` });
  const sys = buildQuickModeSystemPrompt();
  const ctx = { systemPrompt: sys, history, userPrompt: prompt };
  const { text, usage } = await withTimeout(
    runPhase("quick", label, streamModel(providerKeys, model, sys, history, prompt, orOpts), emit, ctx),
    STREAM_PHASE_TIMEOUT_MS,
    label
  );
  const trimmed = text.trim();
  return {
    finalAnswer: trimmed,
    botOutputs: [{ slotId: flow.primarySlot, model, output: trimmed }],
    usageLines: [{ model, promptTokens: usage.promptTokens, completionTokens: usage.completionTokens }],
  };
}

export async function runSuperOrchestratorStream(
  input: StreamInput,
  emit: (e: StreamEvent) => void
): Promise<{ finalAnswer: string; botOutputs: BotRunOutput[]; usageLines: UsageLine[] }> {
  const { providerKeys, flow, models, prompt, history } = input;
  const orOpts = { forceOpenRouter: input.forceOpenRouter };
  const ordered = (["bot1", "bot2", "bot3"] as const).filter((s) => flow[`${s}Enabled`]);
  if (ordered.length === 0) throw new Error("No bot slots enabled");

  emit({ type: "status", message: "Running bots in order (streaming)…" });

  const botOutputs: BotRunOutput[] = [];
  const outputMap: Partial<Record<"bot1" | "bot2" | "bot3", string>> = {};
  const usageLines: UsageLine[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const slotId = ordered[i];
    const model = models[slotId];
    const n = i + 1;
    const label = `Bot ${n} — ${modelLabel(model)}`;
    emit({ type: "status", message: `${label}…` });
    const sys = buildIndividualSystemPrompt();
    const botCtx = { systemPrompt: sys, history, userPrompt: prompt };
    const got = await tryRunPhase(
      slotId,
      label,
      streamModel(providerKeys, model, sys, history, prompt, orOpts),
      emit,
      botCtx
    );
    if (!got) continue;
    const trimmed = got.text.trim();
    if (!trimmed) continue;
    outputMap[slotId] = trimmed;
    botOutputs.push({ slotId, model, output: trimmed });
    usageLines.push({
      model,
      promptTokens: got.usage.promptTokens,
      completionTokens: got.usage.completionTokens,
    });
  }

  if (botOutputs.length === 0) {
    throw new Error("All enabled model calls failed. Check keys/credits and try again.");
  }

  const bot1Out = outputMap.bot1;
  const bot2Out = outputMap.bot2;
  const bot3Out = outputMap.bot3;

  const hasMerge12 = flow.merge12Enabled && bot1Out && bot2Out;
  const hasMerge123 = flow.merge123Enabled && bot3Out;

  let finalAnswer: string;

  const mergeSys = buildMergeSystemPrompt();
  const emptyHist: HistoryMessage[] = [];

  function pushSynthUsage(got: { usage: CompletionUsage } | null) {
    if (!got) return;
    usageLines.push({
      model: models.synth,
      promptTokens: got.usage.promptTokens,
      completionTokens: got.usage.completionTokens,
    });
  }

  if (hasMerge12 && hasMerge123) {
    emit({ type: "status", message: "Merging Bot 1 + Bot 2 (streaming)…" });
    const up12 = buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt);
    const ctx12 = { systemPrompt: mergeSys, history: emptyHist, userPrompt: up12 };
    const combined12got = await tryRunPhase(
      "merge12",
      "Merge Bot 1 + 2",
      streamModel(providerKeys, models.synth, mergeSys, emptyHist, up12, orOpts),
      emit,
      ctx12
    );
    if (!combined12got) {
      finalAnswer = bot3Out!;
    } else {
      pushSynthUsage(combined12got);
      const c12 = combined12got.text.trim();
      emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
      const up123 = buildStagedMergeUserPrompt(c12, bot3Out, prompt);
      const ctx123 = { systemPrompt: mergeSys, history: emptyHist, userPrompt: up123 };
      const merged123got = await tryRunPhase(
        "merge123",
        "Final synthesis",
        streamModel(providerKeys, models.synth, mergeSys, emptyHist, up123, orOpts),
        emit,
        ctx123
      );
      pushSynthUsage(merged123got);
      finalAnswer = merged123got?.text.trim() || c12;
    }
  } else if (hasMerge12 && !hasMerge123) {
    emit({ type: "status", message: "Merging Bot 1 + Bot 2 (streaming)…" });
    const up12b = buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt);
    const ctx12b = { systemPrompt: mergeSys, history: emptyHist, userPrompt: up12b };
    const combined12got = await tryRunPhase(
      "merge12",
      "Merge Bot 1 + 2",
      streamModel(providerKeys, models.synth, mergeSys, emptyHist, up12b, orOpts),
      emit,
      ctx12b
    );
    if (bot3Out) {
      if (!combined12got) {
        finalAnswer = bot3Out;
      } else {
        pushSynthUsage(combined12got);
        const c12 = combined12got.text.trim();
        emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
        const up123b = buildStagedMergeUserPrompt(c12, bot3Out, prompt);
        const ctx123b = { systemPrompt: mergeSys, history: emptyHist, userPrompt: up123b };
        const merged123got = await tryRunPhase(
          "merge123",
          "Final synthesis",
          streamModel(providerKeys, models.synth, mergeSys, emptyHist, up123b, orOpts),
          emit,
          ctx123b
        );
        pushSynthUsage(merged123got);
        finalAnswer = merged123got?.text.trim() || c12;
      }
    } else {
      pushSynthUsage(combined12got);
      finalAnswer = combined12got?.text.trim() || bot1Out || bot2Out || "";
    }
  } else if (!hasMerge12 && hasMerge123 && bot1Out && bot3Out) {
    let left = bot1Out;
    if (bot2Out) {
      emit({ type: "status", message: "Combining Bot 1 + 2 before Bot 3…" });
      const upMid = buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt);
      const ctxMid = { systemPrompt: mergeSys, history: emptyHist, userPrompt: upMid };
      const maybeLeftGot = await tryRunPhase(
        "merge12",
        "Combine Bot 1 + 2",
        streamModel(providerKeys, models.synth, mergeSys, emptyHist, upMid, orOpts),
        emit,
        ctxMid
      );
      pushSynthUsage(maybeLeftGot);
      if (maybeLeftGot?.text.trim()) left = maybeLeftGot.text.trim();
    }
    emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
    const upLast = buildStagedMergeUserPrompt(left.trim(), bot3Out, prompt);
    const ctxLast = { systemPrompt: mergeSys, history: emptyHist, userPrompt: upLast };
    const merged123got = await tryRunPhase(
      "merge123",
      "Final synthesis",
      streamModel(providerKeys, models.synth, mergeSys, emptyHist, upLast, orOpts),
      emit,
      ctxLast
    );
    pushSynthUsage(merged123got);
    finalAnswer = merged123got?.text.trim() || left.trim();
  } else {
    const all = Object.values(outputMap).filter(Boolean) as string[];
    if (all.length === 1) {
      finalAnswer = all[0];
    } else {
      emit({ type: "status", message: "Synthesizing multiple answers…" });
      let acc = all[0];
      for (let i = 1; i < all.length; i++) {
        const upChain = buildStagedMergeUserPrompt(acc, all[i], prompt);
        const ctxChain = { systemPrompt: mergeSys, history: emptyHist, userPrompt: upChain };
        const mergedGot = await tryRunPhase(
          "merge_chain",
          `Synthesis step ${i}`,
          streamModel(providerKeys, models.synth, mergeSys, emptyHist, upChain, orOpts),
          emit,
          ctxChain
        );
        pushSynthUsage(mergedGot);
        if (mergedGot?.text.trim()) acc = mergedGot.text.trim();
      }
      finalAnswer = acc.trim();
    }
  }

  return { finalAnswer, botOutputs, usageLines };
}
