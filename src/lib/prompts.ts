import type { BotRunOutput, ChatMessage } from "@/lib/types";

export function buildIndividualPrompt(input: {
  modelName: string;
  userPrompt: string;
  history: ChatMessage[];
}) {
  return `
You are ${input.modelName}. Answer the user query directly and completely.

Query: ${input.userPrompt}
Context: ${summarizeHistory(input.history)}

Respond concisely but thoroughly.
`.trim();
}

export function buildMergePrompt(input: {
  outputs: BotRunOutput[];
  history: ChatMessage[];
}) {
  const blocks = input.outputs
    .map(
      (entry, index) =>
        `Bot ${index + 1} (${entry.model}): ${entry.output}`,
    )
    .join("\n\n");

  return `
You are the final synthesizer. Merge these model outputs into ONE superior answer.

${blocks}

Context: ${summarizeHistory(input.history)}

Rules:
- Preserve unique insights from ALL bots.
- Fix gaps, contradictions, weak points.
- Make it coherent, comprehensive, no gaps.
- Output ONLY the final merged answer.

Final Answer:
`.trim();
}

export function buildStepMergePrompt(input: {
  leftLabel: string;
  leftText: string;
  rightLabel: string;
  rightText: string;
  history: ChatMessage[];
}) {
  return `
You are the final synthesizer. Merge these two drafts into one stronger answer.

${input.leftLabel}: ${input.leftText}

${input.rightLabel}: ${input.rightText}

Context: ${summarizeHistory(input.history)}

Rules:
- Preserve unique strengths from both drafts.
- Remove contradictions and weak points.
- Return one coherent final answer only.
`.trim();
}

export function buildQuickModePrompt(input: {
  selectedModel: string;
  history: ChatMessage[];
  userPrompt: string;
}) {
  return `
You are ${input.selectedModel}. Continue this conversation.

History: ${summarizeHistory(input.history)}
New question: ${input.userPrompt}

Answer naturally, using prior context.
`.trim();
}

export function summarizeHistory(messages: ChatMessage[]) {
  if (messages.length === 0) {
    return "No prior messages.";
  }
  return messages
    .slice(-12)
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");
}
