import OpenAI from "openai";
import type { HistoryMessage } from "./types";
import type { UserProviderKeys } from "./provider-keys";
import { resolvedKeyForProvider } from "./provider-keys";

// ── Anthropic model ID mapping (OpenRouter slug → direct Anthropic API ID) ──
const ANTHROPIC_IDS: Record<string, string> = {
  "claude-opus-4-5": "claude-opus-4-5",
  "claude-opus-4": "claude-opus-4-20250514",
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-haiku-3-5": "claude-3-5-haiku-20241022",
  "claude-3-7-sonnet": "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku": "claude-3-5-haiku-20241022",
  "claude-3-opus": "claude-3-opus-20240229",
  "claude-3-haiku": "claude-3-haiku-20240307",
};

const DEEPSEEK_IDS: Record<string, string> = {
  "deepseek-chat": "deepseek-chat",
  "deepseek-chat-v3-0324": "deepseek-chat",
  "deepseek-reasoner": "deepseek-reasoner",
  "deepseek-r1": "deepseek-reasoner",
};

const OUTPUT_CAP = 2048;

/** Newer OpenAI chat models reject `max_tokens`; they require `max_completion_tokens`. */
function openAiSlugUsesMaxCompletionTokens(slug: string): boolean {
  const s = slug.toLowerCase();
  if (s.startsWith("gpt-5")) return true;
  if (s.startsWith("gpt-4.1")) return true;
  if (s.startsWith("o1") || s.startsWith("o3") || s.startsWith("o4")) return true;
  if (/^o\d/.test(s)) return true;
  return false;
}

function parseOpenRouterModel(openRouterModel: string): { provider: string; slug: string } {
  const slash = openRouterModel.indexOf("/");
  if (slash === -1) return { provider: "", slug: openRouterModel };
  return {
    provider: openRouterModel.slice(0, slash),
    slug: openRouterModel.slice(slash + 1),
  };
}

/** Token limit fields for chat.completions.create (provider-specific). */
function outputLimitParams(
  openRouterModel: string,
  forceMaxCompletionTokens?: boolean
): { max_tokens: number } | { max_completion_tokens: number } {
  const { provider, slug } = parseOpenRouterModel(openRouterModel);
  if (provider === "openai" && (forceMaxCompletionTokens || openAiSlugUsesMaxCompletionTokens(slug))) {
    return { max_completion_tokens: OUTPUT_CAP };
  }
  return { max_tokens: OUTPUT_CAP };
}

function errorMessage(err: unknown): string {
  return (err as { message?: string })?.message ?? String(err);
}

function isOpenAiMaxTokensUnsupportedError(err: unknown): boolean {
  const m = errorMessage(err).toLowerCase();
  return (
    m.includes("max_tokens") &&
    (m.includes("max_completion_tokens") || m.includes("not supported with this model"))
  );
}

function clientOpenRouter(openRouterModel: string, keys: UserProviderKeys): {
  client: OpenAI;
  modelId: string;
} {
  const key = resolvedKeyForProvider(keys, "openrouter");
  return {
    client: new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: key,
      defaultHeaders: {
        "HTTP-Referer": "https://multibot-orchestrator.app",
        "X-Title": "MultiBot Orchestrator",
      },
    }),
    modelId: openRouterModel,
  };
}

// ── Build an OpenAI-SDK client for any provider ──────────────────────────────
function clientForModel(openRouterModel: string, keys: UserProviderKeys): {
  client: OpenAI;
  modelId: string;
} {
  const slash = openRouterModel.indexOf("/");
  const provider = slash === -1 ? "" : openRouterModel.slice(0, slash);
  const slug = slash === -1 ? openRouterModel : openRouterModel.slice(slash + 1);

  switch (provider) {
    case "openai": {
      const key = resolvedKeyForProvider(keys, "openai");
      return {
        client: new OpenAI({ apiKey: key }),
        modelId: slug,
      };
    }

    case "anthropic": {
      const key = resolvedKeyForProvider(keys, "anthropic");
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

    case "x-ai": {
      const key = resolvedKeyForProvider(keys, "xai");
      return {
        client: new OpenAI({
          baseURL: "https://api.x.ai/v1",
          apiKey: key,
        }),
        modelId: slug,
      };
    }

    case "deepseek": {
      const key = resolvedKeyForProvider(keys, "deepseek");
      return {
        client: new OpenAI({
          baseURL: "https://api.deepseek.com/v1",
          apiKey: key,
        }),
        modelId: DEEPSEEK_IDS[slug] ?? slug,
      };
    }

    case "google":
    case "qwen":
    case "moonshotai":
    case "mistralai":
      return clientOpenRouter(openRouterModel, keys);

    default:
      return clientOpenRouter(openRouterModel, keys);
  }
}

function openRouterClient(keys: UserProviderKeys): OpenAI {
  const key = resolvedKeyForProvider(keys, "openrouter");
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

function formatProviderError(err: unknown, openRouterModel: string): Error {
  const status = (err as { status?: number })?.status;
  const raw = errorMessage(err);
  const tag = `[${openRouterModel}]`;
  if (status === 404 || raw.includes("404")) {
    return new Error(
      `${tag} Model or API path not found (404). ` +
        "That ID may not exist on the direct provider yet—pick another model, or enable OPENROUTER_FALLBACK=1."
    );
  }
  const body = err instanceof Error ? err.message : raw;
  return new Error(`${tag} ${body}`);
}

// ── Main call function ───────────────────────────────────────────────────────
export async function callModel(
  keys: UserProviderKeys,
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
  const { client, modelId } = clientForModel(openRouterModel, keys);

  async function createOnce(forceCompletion: boolean) {
    return client.chat.completions.create({
      model: modelId,
      messages,
      ...outputLimitParams(openRouterModel, forceCompletion),
    });
  }

  try {
    let response;
    try {
      response = await createOnce(false);
    } catch (err) {
      const { provider } = parseOpenRouterModel(openRouterModel);
      if (provider === "openai" && isOpenAiMaxTokensUnsupportedError(err)) {
        response = await createOnce(true);
      } else {
        throw err;
      }
    }
    return response.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    if (isModelNotFoundError(err)) {
      if (!openRouterFallbackEnabled()) {
        throw new Error(
          `[${openRouterModel}] Model unavailable on direct provider API. ` +
            "Pick another model, or enable OpenRouter fallback by setting OPENROUTER_FALLBACK=1."
        );
      }
      const fallback = openRouterClient(keys);
      const response = await fallback.chat.completions.create({
        model: openRouterModel,
        messages,
        ...outputLimitParams(openRouterModel),
      });
      return response.choices[0]?.message?.content?.trim() ?? "";
    }
    throw formatProviderError(err, openRouterModel);
  }
}

/** Stream completion tokens; falls back to one-shot `callModel` if streaming fails. */
export async function* streamModel(
  keys: UserProviderKeys,
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
  const { client, modelId } = clientForModel(openRouterModel, keys);

  async function* streamChat(
    c: OpenAI,
    apiModel: string,
    fullModelIdForLimits: string,
    forceCompletion: boolean
  ): AsyncGenerator<string, void, unknown> {
    const stream = await c.chat.completions.create({
      model: apiModel,
      messages,
      stream: true,
      ...outputLimitParams(fullModelIdForLimits, forceCompletion),
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  try {
    try {
      yield* streamChat(client, modelId, openRouterModel, false);
    } catch (err) {
      const { provider } = parseOpenRouterModel(openRouterModel);
      if (provider === "openai" && isOpenAiMaxTokensUnsupportedError(err)) {
        yield* streamChat(client, modelId, openRouterModel, true);
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (isModelNotFoundError(err) && openRouterFallbackEnabled()) {
      const fallback = openRouterClient(keys);
      yield* streamChat(fallback, openRouterModel, openRouterModel, false);
      return;
    }
    if (isModelNotFoundError(err) && !openRouterFallbackEnabled()) {
      throw new Error(
        `[${openRouterModel}] Model unavailable on direct provider API. Pick another model or set OPENROUTER_FALLBACK=1.`
      );
    }
    try {
      const full = await callModel(keys, openRouterModel, systemPrompt, history, userPrompt);
      if (full) yield full;
    } catch {
      throw formatProviderError(err, openRouterModel);
    }
  }
}
