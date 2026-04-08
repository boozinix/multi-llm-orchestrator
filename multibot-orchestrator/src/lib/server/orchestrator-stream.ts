import { streamModel } from "../openrouter";
import { modelLabel } from "../constants";
import {
  buildIndividualSystemPrompt,
  buildMergeSystemPrompt,
  buildStagedMergeUserPrompt,
  buildQuickModeSystemPrompt,
} from "../prompts";
import type { UserProviderKeys } from "../provider-keys";
import type { BotRunOutput, FlowConfig, HistoryMessage, ModelConfig } from "../types";

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

async function tryRunPhase(
  phase: StreamPhase,
  label: string,
  gen: AsyncGenerator<string, void, unknown>,
  emit: (e: StreamEvent) => void
): Promise<string | null> {
  try {
    return await withTimeout(runPhase(phase, label, gen, emit), STREAM_PHASE_TIMEOUT_MS, label);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "model call failed";
    emit({ type: "status", message: `${label} failed, skipping. (${msg})` });
    return null;
  }
}

async function collectStream(
  gen: AsyncGenerator<string, void, unknown>,
  phase: StreamPhase,
  emit: (e: StreamEvent) => void
): Promise<string> {
  let full = "";
  for await (const delta of gen) {
    full += delta;
    emit({ type: "token", phase, delta });
  }
  emit({ type: "phase_end", phase, text: full });
  return full;
}

async function runPhase(
  phase: StreamPhase,
  label: string,
  gen: AsyncGenerator<string, void, unknown>,
  emit: (e: StreamEvent) => void
): Promise<string> {
  emit({ type: "phase_start", phase, label });
  return collectStream(gen, phase, emit);
}

export async function runQuickOrchestratorStream(
  input: StreamInput,
  emit: (e: StreamEvent) => void
): Promise<{ finalAnswer: string; botOutputs: BotRunOutput[] }> {
  const { providerKeys, flow, models, prompt, history } = input;
  const model = models[flow.primarySlot];
  const label = `Quick — ${modelLabel(model)}`;
  emit({ type: "status", message: `Starting ${label}…` });
  const text = await withTimeout(
    runPhase(
      "quick",
      label,
      streamModel(providerKeys, model, buildQuickModeSystemPrompt(), history, prompt),
      emit
    ),
    STREAM_PHASE_TIMEOUT_MS,
    label
  );
  return {
    finalAnswer: text.trim(),
    botOutputs: [{ slotId: flow.primarySlot, model, output: text.trim() }],
  };
}

export async function runSuperOrchestratorStream(
  input: StreamInput,
  emit: (e: StreamEvent) => void
): Promise<{ finalAnswer: string; botOutputs: BotRunOutput[] }> {
  const { providerKeys, flow, models, prompt, history } = input;
  const ordered = (["bot1", "bot2", "bot3"] as const).filter((s) => flow[`${s}Enabled`]);
  if (ordered.length === 0) throw new Error("No bot slots enabled");

  emit({ type: "status", message: "Running bots in order (streaming)…" });

  const botOutputs: BotRunOutput[] = [];
  const outputMap: Partial<Record<"bot1" | "bot2" | "bot3", string>> = {};

  for (let i = 0; i < ordered.length; i++) {
    const slotId = ordered[i];
    const model = models[slotId];
    const n = i + 1;
    const label = `Bot ${n} — ${modelLabel(model)}`;
    emit({ type: "status", message: `${label}…` });
    const text = await tryRunPhase(
      slotId,
      label,
      streamModel(providerKeys, model, buildIndividualSystemPrompt(), history, prompt),
      emit
    );
    if (!text) continue;
    const trimmed = text.trim();
    if (!trimmed) continue;
    outputMap[slotId] = trimmed;
    botOutputs.push({ slotId, model, output: trimmed });
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

  if (hasMerge12 && hasMerge123) {
    emit({ type: "status", message: "Merging Bot 1 + Bot 2 (streaming)…" });
    const combined12 = await tryRunPhase(
      "merge12",
      "Merge Bot 1 + 2",
      streamModel(
        providerKeys,
        models.synth,
        buildMergeSystemPrompt(),
        [],
        buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
      ),
      emit
    );
    if (!combined12) {
      finalAnswer = bot3Out;
    } else {
      emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
      const merged123 = await tryRunPhase(
        "merge123",
        "Final synthesis",
        streamModel(
          providerKeys,
          models.synth,
          buildMergeSystemPrompt(),
          [],
          buildStagedMergeUserPrompt(combined12.trim(), bot3Out, prompt)
        ),
        emit
      );
      finalAnswer = merged123?.trim() || combined12.trim();
    }
  } else if (hasMerge12 && !hasMerge123) {
    emit({ type: "status", message: "Merging Bot 1 + Bot 2 (streaming)…" });
    const combined12 = await tryRunPhase(
      "merge12",
      "Merge Bot 1 + 2",
      streamModel(
        providerKeys,
        models.synth,
        buildMergeSystemPrompt(),
        [],
        buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
      ),
      emit
    );
    if (bot3Out) {
      if (!combined12) {
        finalAnswer = bot3Out;
      } else {
        emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
        const merged123 = await tryRunPhase(
          "merge123",
          "Final synthesis",
          streamModel(
            providerKeys,
            models.synth,
            buildMergeSystemPrompt(),
            [],
            buildStagedMergeUserPrompt(combined12.trim(), bot3Out, prompt)
          ),
          emit
        );
        finalAnswer = merged123?.trim() || combined12.trim();
      }
    } else {
      finalAnswer = combined12?.trim() || bot1Out || bot2Out || "";
    }
  } else if (!hasMerge12 && hasMerge123 && bot1Out && bot3Out) {
    let left = bot1Out;
    if (bot2Out) {
      emit({ type: "status", message: "Combining Bot 1 + 2 before Bot 3…" });
      const maybeLeft = await tryRunPhase(
        "merge12",
        "Combine Bot 1 + 2",
        streamModel(
          providerKeys,
          models.synth,
          buildMergeSystemPrompt(),
          [],
          buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
        ),
        emit
      );
      if (maybeLeft?.trim()) left = maybeLeft.trim();
    }
    emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
    const merged123 = await tryRunPhase(
      "merge123",
      "Final synthesis",
      streamModel(
        providerKeys,
        models.synth,
        buildMergeSystemPrompt(),
        [],
        buildStagedMergeUserPrompt(left.trim(), bot3Out, prompt)
      ),
      emit
    );
    finalAnswer = merged123?.trim() || left.trim();
  } else {
    const all = Object.values(outputMap).filter(Boolean) as string[];
    if (all.length === 1) {
      finalAnswer = all[0];
    } else {
      emit({ type: "status", message: "Synthesizing multiple answers…" });
      let acc = all[0];
      for (let i = 1; i < all.length; i++) {
        const merged = await tryRunPhase(
          "merge_chain",
          `Synthesis step ${i}`,
          streamModel(
            providerKeys,
            models.synth,
            buildMergeSystemPrompt(),
            [],
            buildStagedMergeUserPrompt(acc, all[i], prompt)
          ),
          emit
        );
        if (merged?.trim()) acc = merged.trim();
      }
      finalAnswer = acc.trim();
    }
  }

  return { finalAnswer, botOutputs };
}
