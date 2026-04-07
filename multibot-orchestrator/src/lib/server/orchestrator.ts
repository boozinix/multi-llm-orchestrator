import { callModel } from "../openrouter";
import {
  buildIndividualSystemPrompt,
  buildMergeSystemPrompt,
  buildStagedMergeUserPrompt,
  buildQuickModeSystemPrompt,
} from "../prompts";
import type { FlowConfig, ModelConfig, BotRunOutput, HistoryMessage } from "../types";

export interface OrchestratorInput {
  apiKey: string;
  flow: FlowConfig;
  models: ModelConfig;
  prompt: string;
  history: HistoryMessage[];
}

export interface OrchestratorResult {
  finalAnswer: string;
  botOutputs: BotRunOutput[];
}

export async function runQuickOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { apiKey, flow, models, prompt, history } = input;
  const model = models[flow.primarySlot];
  const output = await callModel(apiKey, model, buildQuickModeSystemPrompt(), history, prompt);
  return {
    finalAnswer: output,
    botOutputs: [{ slotId: flow.primarySlot, model, output }],
  };
}

export async function runSuperOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  const { apiKey, flow, models, prompt, history } = input;

  const enabledSlots = (["bot1", "bot2", "bot3"] as const).filter((s) => flow[`${s}Enabled`]);

  if (enabledSlots.length === 0) {
    throw new Error("No bot slots enabled");
  }

  // Parallel fan-out to all enabled bots
  const results = await Promise.all(
    enabledSlots.map(async (slotId) => {
      const model = models[slotId];
      const output = await callModel(apiKey, model, buildIndividualSystemPrompt(), history, prompt);
      return { slotId, model, output } as BotRunOutput;
    })
  );

  const botOutputs = results;
  const outputMap: Record<string, string> = {};
  for (const r of results) outputMap[r.slotId] = r.output;

  const bot1Out = outputMap["bot1"];
  const bot2Out = outputMap["bot2"];
  const bot3Out = outputMap["bot3"];

  let finalAnswer: string;

  const hasMerge12 = flow.merge12Enabled && bot1Out && bot2Out;
  const hasMerge123 = flow.merge123Enabled && bot3Out;

  if (hasMerge12 && hasMerge123) {
    // Staged merge: (bot1+bot2), then + bot3
    const combined12 = await callModel(
      apiKey, models.synth, buildMergeSystemPrompt(), [],
      buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
    );
    finalAnswer = await callModel(
      apiKey, models.synth, buildMergeSystemPrompt(), [],
      buildStagedMergeUserPrompt(combined12, bot3Out, prompt)
    );
  } else if (hasMerge12 && !hasMerge123) {
    // Merge bot1+bot2 only; if bot3 exists fold it in at the end
    const combined12 = await callModel(
      apiKey, models.synth, buildMergeSystemPrompt(), [],
      buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
    );
    if (bot3Out) {
      // bot3 exists but merge123 is off — still fold in via a final merge
      finalAnswer = await callModel(
        apiKey, models.synth, buildMergeSystemPrompt(), [],
        buildStagedMergeUserPrompt(combined12, bot3Out, prompt)
      );
    } else {
      finalAnswer = combined12;
    }
  } else if (!hasMerge12 && hasMerge123 && bot1Out && bot3Out) {
    // Skip merge12, go straight to merge with bot3
    const left = bot2Out ? await callModel(
      apiKey, models.synth, buildMergeSystemPrompt(), [],
      buildStagedMergeUserPrompt(bot1Out, bot2Out, prompt)
    ) : bot1Out;
    finalAnswer = await callModel(
      apiKey, models.synth, buildMergeSystemPrompt(), [],
      buildStagedMergeUserPrompt(left, bot3Out, prompt)
    );
  } else {
    // No merges: use synthesis model to combine all available outputs
    const allOutputs = Object.values(outputMap);
    if (allOutputs.length === 1) {
      finalAnswer = allOutputs[0];
    } else {
      const combined = allOutputs.reduce(async (accPromise, curr, i) => {
        const acc = await accPromise;
        if (i === 0) return curr;
        return callModel(apiKey, models.synth, buildMergeSystemPrompt(), [], buildStagedMergeUserPrompt(acc, curr, prompt));
      }, Promise.resolve(allOutputs[0]));
      finalAnswer = await combined;
    }
  }

  return { finalAnswer, botOutputs };
}
