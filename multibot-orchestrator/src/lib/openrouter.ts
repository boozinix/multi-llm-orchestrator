import OpenAI from "openai";
import type { HistoryMessage } from "./types";

// ── Anthropic model ID mapping (OpenRouter slug → direct Anthropic API ID) ──
const ANTHROPIC_IDS: Record<string, string> = {
  "claude-opus-4-5":   "claude-opus-4-5",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-3-7-sonnet": "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku":  "claude-3-5-haiku-20241022",
  "claude-3-opus":     "claude-3-opus-20240229",
  "claude-3-haiku":    "claude-3-haiku-20240307",
};

const DEEPSEEK_IDS: Record<string, string> = {
  "deepseek-chat": "deepseek-chat",
  "deepseek-chat-v3-0324": "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner",
  "deepseek-r1": "deepseek-reasoner",
};

// ── Build an OpenAI-SDK client for any provider ──────────────────────────────
function clientForModel(openRouterModel: string, clientApiKey: string): {
  client: OpenAI;
  modelId: string;
} {
  const slash = openRouterModel.indexOf("/");
  const provider = slash === -1 ? "" : openRouterModel.slice(0, slash);
  const slug = slash === -1 ? openRouterModel : openRouterModel.slice(slash + 1);

  switch (provider) {
    case "openai": {
      const key = process.env.OPENAI_API_KEY || clientApiKey;
      return {
        client: new OpenAI({ apiKey: key }),
        modelId: slug, // e.g. "gpt-4o"
      };
    }

    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY || clientApiKey;
      return {
        client: new OpenAI({
          baseURL: "https://api.anthropic.com/v1",
          apiKey: key,
          defaultHeaders: {
            "anthropic-version": "2023-06-01",
          },
        }),
        modelId: ANTHROPIC_IDS[slug] ?? slug,
      };
    }

    case "google": {
      const key = process.env.GEMINI_API_KEY || clientApiKey;
      return {
        client: new OpenAI({
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
          apiKey: key,
        }),
        modelId: slug, // e.g. "gemini-2.0-flash-001"
      };
    }

    case "x-ai": {
      const key = process.env.XAI_API_KEY || clientApiKey;
      return {
        client: new OpenAI({
          baseURL: "https://api.x.ai/v1",
          apiKey: key,
        }),
        modelId: slug, // e.g. "grok-3"
      };
    }

    case "deepseek": {
      const key = process.env.DEEPSEEK_API_KEY || clientApiKey;
      return {
        client: new OpenAI({
          baseURL: "https://api.deepseek.com/v1",
          apiKey: key,
        }),
        modelId: DEEPSEEK_IDS[slug] ?? slug,
      };
    }

    default: {
      // Fallback → OpenRouter
      const key = process.env.OPENROUTER_API_KEY || clientApiKey;
      return {
        client: new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: key,
          defaultHeaders: {
            "HTTP-Referer": "https://multibot-orchestrator.app",
            "X-Title": "MultiBot Orchestrator",
          },
        }),
        modelId: openRouterModel, // OpenRouter wants the full "provider/model" string
      };
    }
  }
}

function openRouterClient(clientApiKey: string): OpenAI {
  const key = process.env.OPENROUTER_API_KEY || clientApiKey;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    defaultHeaders: {
      "HTTP-Referer": "https://multibot-orchestrator.app",
      "X-Title": "MultiBot Orchestrator",
    },
  });
}

function openRouterFallbackEnabled(): boolean {
  const raw = (process.env.OPENROUTER_FALLBACK ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function isModelNotFoundError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = ((err as { message?: string })?.message ?? "").toLowerCase();
  if (status === 404) return true;
  return (
    status === 400 &&
    (message.includes("model not exist") ||
      message.includes("model does not exist") ||
      message.includes("model not found") ||
      message.includes("unknown model") ||
      message.includes("invalid model"))
  );
}

function formatProviderError(err: unknown, modelLabel: string): Error {
  const status = (err as { status?: number })?.status;
  const raw = (err as { message?: string })?.message ?? String(err);
  if (status === 404 || raw.includes("404")) {
    return new Error(
      `Model or API path not found (404) for "${modelLabel}". ` +
        "That ID may not exist on the direct provider yet—pick another model, or enable OPENROUTER_FALLBACK=1."
    );
  }
  return err instanceof Error ? err : new Error(raw);
}

// ── Main call function ───────────────────────────────────────────────────────
export async function callModel(
  clientApiKey: string,
  openRouterModel: string,
  systemPrompt: string,
  history: HistoryMessage[],
  userPrompt: string
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userPrompt },
  ];
  const { client, modelId } = clientForModel(openRouterModel, clientApiKey);

  try {
    const response = await client.chat.completions.create({
      model: modelId,
      messages,
      max_tokens: 2048,
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    // Some providers use different internal model IDs than OpenRouter slugs.
    // If that happens, retry via OpenRouter transparently.
    if (isModelNotFoundError(err)) {
      if (!openRouterFallbackEnabled()) {
        throw new Error(
          `Model unavailable on direct provider API: ${openRouterModel}. ` +
          "Pick another model, or enable OpenRouter fallback by setting OPENROUTER_FALLBACK=1."
        );
      }
      const fallback = openRouterClient(clientApiKey);
      const response = await fallback.chat.completions.create({
        model: openRouterModel,
        messages,
        max_tokens: 2048,
      });
      return response.choices[0]?.message?.content?.trim() ?? "";
    }
    throw formatProviderError(err, openRouterModel);
  }
}

/** Stream completion tokens; falls back to one-shot `callModel` if streaming fails. */
export async function* streamModel(
  clientApiKey: string,
  openRouterModel: string,
  systemPrompt: string,
  history: HistoryMessage[],
  userPrompt: string
): AsyncGenerator<string, void, unknown> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userPrompt },
  ];
  const { client, modelId } = clientForModel(openRouterModel, clientApiKey);

  async function* viaOpenAI(c: OpenAI, m: string): AsyncGenerator<string, void, unknown> {
    const stream = await c.chat.completions.create({
      model: m,
      messages,
      max_tokens: 2048,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  try {
    yield* viaOpenAI(client, modelId);
  } catch (err) {
    if (isModelNotFoundError(err) && openRouterFallbackEnabled()) {
      const fallback = openRouterClient(clientApiKey);
      yield* viaOpenAI(fallback, openRouterModel);
      return;
    }
    if (isModelNotFoundError(err) && !openRouterFallbackEnabled()) {
      throw new Error(
        `Model unavailable on direct provider API: ${openRouterModel}. Pick another model or set OPENROUTER_FALLBACK=1.`
      );
    }
    try {
      const full = await callModel(clientApiKey, openRouterModel, systemPrompt, history, userPrompt);
      if (full) yield full;
    } catch {
      throw formatProviderError(err, openRouterModel);
    }
  }
}
