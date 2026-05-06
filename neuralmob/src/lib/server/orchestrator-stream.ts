import { streamModel, estimateUsageFromMessages } from "../openrouter";
import { modelLabel } from "../constants";
import {
  buildFinalJudgeSystemPrompt,
  buildFinalJudgeUserPrompt,
  buildIndependentSystemPrompt,
  buildMerge12SystemPrompt,
  buildMerge12UserPrompt,
  buildQuickModeSystemPrompt,
  buildChainFirstSystemPrompt,
  buildChainReviewerSystemPrompt,
  buildChainReviewerUserPrompt,
  classifyQueryComplexity,
} from "../prompts";
import type { UserProviderKeys } from "../provider-keys";
import type { BotRunOutput, CompletionUsage, FlowConfig, HistoryMessage, ModelConfig, UsageLine } from "../types";
import { registerSlotSkipper } from "./run-registry";

export type StreamPhase =
  | "quick"
  | "bot1"
  | "bot2"
  | "bot3"
  | "merge12"
  | "merge123"
  | "merge_chain"
  | "chain1"
  | "chain2"
  | "chain3";

export type StreamEvent =
  | { type: "run_id"; runId: string }
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
  /** Identifies this run in the skip registry so individual slots can be skipped. */
  runId?: string;
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
  const complexity = classifyQueryComplexity(prompt);
  const model = models[flow.primarySlot];
  const label = `Quick — ${modelLabel(model)}`;
  emit({ type: "status", message: `Starting ${label}…` });
  const sys = buildQuickModeSystemPrompt(complexity);
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
  const complexity = classifyQueryComplexity(prompt);
  const ordered = (["bot1", "bot2", "bot3"] as const).filter((s) => flow[`${s}Enabled`]);
  if (ordered.length === 0) throw new Error("No bot slots enabled");

  emit({ type: "status", message: `Running ${ordered.length} mind${ordered.length > 1 ? "s" : ""} in parallel (streaming)…` });

  const botOutputs: BotRunOutput[] = [];
  const outputMap: Partial<Record<"bot1" | "bot2" | "bot3", string>> = {};
  const usageLines: UsageLine[] = [];

  // Fire all bots simultaneously — total time = max(T1, T2, T3) instead of T1+T2+T3
  const botPromises = ordered.map((slotId, i) => {
    const model = models[slotId];
    const n = i + 1;
    const label = `Mind ${n} — ${modelLabel(model)}`;
    const sys = buildIndependentSystemPrompt(n, complexity);
    const botCtx = { systemPrompt: sys, history, userPrompt: prompt };

    // Create a skip promise: if the user clicks "Skip Mind X", this resolves early.
    let skipResolve!: () => void;
    const skipPromise = new Promise<null>((resolve) => {
      skipResolve = () => resolve(null);
    });
    if (input.runId) {
      registerSlotSkipper(input.runId, slotId, skipResolve);
    }

    const phasePromise = tryRunPhase(
      slotId,
      label,
      streamModel(providerKeys, model, sys, history, prompt, orOpts),
      emit,
      botCtx
    ).then((got) => ({ slotId, model, got }));

    const skipRacePromise = skipPromise.then(() => {
      emit({ type: "status", message: `${label} skipped by user.` });
      return { slotId, model, got: null as null };
    });

    return Promise.race([phasePromise, skipRacePromise]);
  });

  const results = await Promise.all(botPromises);

  for (const { slotId, model, got } of results) {
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

  const merge12Sys = buildMerge12SystemPrompt(complexity);
  const finalJudgeSys = buildFinalJudgeSystemPrompt(complexity);
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
    emit({ type: "status", message: "Comparing Mind 1 + Mind 2 (streaming)…" });
    const up12 = buildMerge12UserPrompt(prompt, bot1Out, bot2Out);
    const ctx12 = { systemPrompt: merge12Sys, history: emptyHist, userPrompt: up12 };
    const combined12got = await tryRunPhase(
      "merge12",
      "Judge 1 + 2",
      streamModel(providerKeys, models.synth, merge12Sys, emptyHist, up12, orOpts),
      emit,
      ctx12
    );
    if (!combined12got) {
      finalAnswer = bot3Out!;
    } else {
      pushSynthUsage(combined12got);
      const c12 = combined12got.text.trim();
      emit({ type: "status", message: "Comparing (1 + 2) against Mind 3 (streaming)…" });
      const up123 = buildFinalJudgeUserPrompt(prompt, c12, bot3Out);
      const ctx123 = { systemPrompt: finalJudgeSys, history: emptyHist, userPrompt: up123 };
      const merged123got = await tryRunPhase(
        "merge123",
        "Final judgment",
        streamModel(providerKeys, models.synth, finalJudgeSys, emptyHist, up123, orOpts),
        emit,
        ctx123
      );
      pushSynthUsage(merged123got);
      finalAnswer = merged123got?.text.trim() || c12;
    }
  } else if (hasMerge12 && !hasMerge123) {
    emit({ type: "status", message: "Comparing Mind 1 + Mind 2 (streaming)…" });
    const up12b = buildMerge12UserPrompt(prompt, bot1Out, bot2Out);
    const ctx12b = { systemPrompt: merge12Sys, history: emptyHist, userPrompt: up12b };
    const combined12got = await tryRunPhase(
      "merge12",
      "Judge 1 + 2",
      streamModel(providerKeys, models.synth, merge12Sys, emptyHist, up12b, orOpts),
      emit,
      ctx12b
    );
    pushSynthUsage(combined12got);
    finalAnswer = combined12got?.text.trim() || bot1Out || bot2Out || "";
  } else if (!hasMerge12 && hasMerge123) {
    const left = bot1Out ?? bot2Out;
    if (left && bot3Out) {
      emit({ type: "status", message: "Comparing prior answer against Mind 3 (streaming)…" });
      const upLast = buildFinalJudgeUserPrompt(prompt, left.trim(), bot3Out);
      const ctxLast = { systemPrompt: finalJudgeSys, history: emptyHist, userPrompt: upLast };
      const merged123got = await tryRunPhase(
        "merge123",
        "Final judgment",
        streamModel(providerKeys, models.synth, finalJudgeSys, emptyHist, upLast, orOpts),
        emit,
        ctxLast
      );
      pushSynthUsage(merged123got);
      finalAnswer = merged123got?.text.trim() || left.trim();
    } else {
      finalAnswer = left?.trim() || bot3Out || "";
    }
  } else {
    finalAnswer = bot1Out ?? bot2Out ?? bot3Out ?? "";
  }

  return { finalAnswer, botOutputs, usageLines };
}

export async function runChainOrchestratorStream(
  input: StreamInput,
  emit: (e: StreamEvent) => void
): Promise<{ finalAnswer: string; botOutputs: BotRunOutput[]; usageLines: UsageLine[] }> {
  const { providerKeys, flow, models, prompt, history } = input;
  const orOpts = { forceOpenRouter: input.forceOpenRouter };
  const complexity = classifyQueryComplexity(prompt);
  const ordered = (["bot1", "bot2", "bot3"] as const).filter((s) => flow[`${s}Enabled`]);
  if (ordered.length === 0) throw new Error("No bot slots enabled");

  const chainPhases = ["chain1", "chain2", "chain3"] as const;
  const botOutputs: BotRunOutput[] = [];
  const usageLines: UsageLine[] = [];
  let previousAnswer = "";

  for (let i = 0; i < ordered.length; i++) {
    const slotId = ordered[i];
    const model = models[slotId];
    const phase = chainPhases[i];
    const stepNum = i + 1;

    const isFirst = i === 0;
    const sys = isFirst
      ? buildChainFirstSystemPrompt(complexity)
      : buildChainReviewerSystemPrompt(stepNum, complexity);
    const userPrompt = isFirst
      ? prompt
      : buildChainReviewerUserPrompt(prompt, previousAnswer);
    const label = isFirst
      ? `Step ${stepNum} — ${modelLabel(model)}`
      : `Step ${stepNum} — ${modelLabel(model)} (reviewing)`;

    emit({ type: "status", message: `${label}…` });

    const ctx = { systemPrompt: sys, history: isFirst ? history : [], userPrompt };
    const got = await tryRunPhase(
      phase,
      label,
      streamModel(providerKeys, model, sys, isFirst ? history : [], userPrompt, orOpts),
      emit,
      ctx
    );

    if (got) {
      const trimmed = got.text.trim();
      previousAnswer = trimmed;
      botOutputs.push({ slotId, model, output: trimmed });
      usageLines.push({
        model,
        promptTokens: got.usage.promptTokens,
        completionTokens: got.usage.completionTokens,
      });
    } else if (i === 0) {
      throw new Error("First model in chain failed. Cannot continue.");
    }
    // If a reviewer fails, we continue with the previous answer
  }

  const finalAnswer = previousAnswer;
  if (!finalAnswer) throw new Error("All chain steps failed.");

  return { finalAnswer, botOutputs, usageLines };
}
