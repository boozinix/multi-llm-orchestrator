import { streamModel } from "../openrouter";
import { modelLabel } from "../constants";
import {
  buildIndividualSystemPrompt,
  buildMergeSystemPrompt,
  buildStagedMergeUserPrompt,
  buildQuickModeSystemPrompt,
} from "../prompts";
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
  apiKey: string;
  flow: FlowConfig;
  models: ModelConfig;
  prompt: string;
  history: HistoryMessage[];
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
  const { apiKey, flow, models, prompt, history } = input;
  const model = models[flow.primarySlot];
  const label = `Quick — ${modelLabel(model)}`;
  emit({ type: "status", message: `Starting ${label}…` });
  const text = await runPhase(
    "quick",
    label,
    streamModel(apiKey, model, buildQuickModeSystemPrompt(), history, prompt),
    emit
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
  const { apiKey, flow, models, prompt, history } = input;
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
    const text = await runPhase(
      slotId,
      label,
      streamModel(apiKey, model, buildIndividualSystemPrompt(), history, prompt),
      emit
    );
    const trimmed = text.trim();
    outputMap[slotId] = trimmed;
    botOutputs.push({ slotId, model, output: trimmed });
  }

  const bot1Out = outputMap.bot1;
  const bot2Out = outputMap.bot2;
  const bot3Out = outputMap.bot3;

  const hasMerge12 = flow.merge12Enabled && bot1Out && bot2Out;
  const hasMerge123 = flow.merge123Enabled && bot3Out;

  let finalAnswer: string;

  if (hasMerge12 && hasMerge123) {
    emit({ type: "status", message: "Merging Bot 1 + Bot 2 (streaming)…" });
    const combined12 = await runPhase(
      "merge12",
      "Merge Bot 1 + 2",
      streamModel(
        apiKey,
        models.synth,
        buildMergeSystemPrompt(),
        [],
        buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
      ),
      emit
    );
    emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
    finalAnswer = (
      await runPhase(
        "merge123",
        "Final synthesis",
        streamModel(
          apiKey,
          models.synth,
          buildMergeSystemPrompt(),
          [],
          buildStagedMergeUserPrompt(combined12.trim(), bot3Out, prompt)
        ),
        emit
      )
    ).trim();
  } else if (hasMerge12 && !hasMerge123) {
    emit({ type: "status", message: "Merging Bot 1 + Bot 2 (streaming)…" });
    const combined12 = await runPhase(
      "merge12",
      "Merge Bot 1 + 2",
      streamModel(
        apiKey,
        models.synth,
        buildMergeSystemPrompt(),
        [],
        buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
      ),
      emit
    );
    if (bot3Out) {
      emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
      finalAnswer = (
        await runPhase(
          "merge123",
          "Final synthesis",
          streamModel(
            apiKey,
            models.synth,
            buildMergeSystemPrompt(),
            [],
            buildStagedMergeUserPrompt(combined12.trim(), bot3Out, prompt)
          ),
          emit
        )
      ).trim();
    } else {
      finalAnswer = combined12.trim();
    }
  } else if (!hasMerge12 && hasMerge123 && bot1Out && bot3Out) {
    let left = bot1Out;
    if (bot2Out) {
      emit({ type: "status", message: "Combining Bot 1 + 2 before Bot 3…" });
      left = await runPhase(
        "merge12",
        "Combine Bot 1 + 2",
        streamModel(
          apiKey,
          models.synth,
          buildMergeSystemPrompt(),
          [],
          buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
        ),
        emit
      );
    }
    emit({ type: "status", message: "Merging with Bot 3 (streaming)…" });
    finalAnswer = (
      await runPhase(
        "merge123",
        "Final synthesis",
        streamModel(
          apiKey,
          models.synth,
          buildMergeSystemPrompt(),
          [],
          buildStagedMergeUserPrompt(left.trim(), bot3Out, prompt)
        ),
        emit
      )
    ).trim();
  } else {
    const all = Object.values(outputMap).filter(Boolean) as string[];
    if (all.length === 1) {
      finalAnswer = all[0];
    } else {
      emit({ type: "status", message: "Synthesizing multiple answers…" });
      let acc = all[0];
      for (let i = 1; i < all.length; i++) {
        acc = await runPhase(
          "merge_chain",
          `Synthesis step ${i}`,
          streamModel(
            apiKey,
            models.synth,
            buildMergeSystemPrompt(),
            [],
            buildStagedMergeUserPrompt(acc, all[i], prompt)
          ),
          emit
        );
      }
      finalAnswer = acc.trim();
    }
  }

  return { finalAnswer, botOutputs };
}
