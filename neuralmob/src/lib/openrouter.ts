import OpenAI from "openai";
import type { CompletionUsage, HistoryMessage } from "./types";
import type { UserProviderKeys } from "./provider-keys";
import { resolvedKeyForProvider } from "./provider-keys";

/** OpenRouter attribution; on Vercel uses VERCEL_URL unless OPENROUTER_HTTP_REFERER is set. */
function openRouterSiteHeaders(): { referer: string; title: string } {
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3010");
  return {
    referer,
    title: process.env.OPENROUTER_APP_TITLE?.trim() || "Neuralmob",
  };
}

export type ModelCallResult = { text: string; usage: CompletionUsage };

/** Rough token estimate when the provider omits usage (chars / 4, min 1). */
export function estimateUsageFromMessages(
  systemPrompt: string,
  history: HistoryMessage[],
  userPrompt: string,
  output: string
): CompletionUsage {
  const histChars = history.reduce((acc, h) => acc + h.content.length, 0);
  const promptChars = systemPrompt.length + histChars + userPrompt.length;
  return {
    promptTokens: Math.max(1, Math.ceil(promptChars / 4)),
    completionTokens: Math.max(1, Math.ceil(output.length / 4)),
    estimated: true,
  };
}

function usageFromApiResponse(response: OpenAI.Chat.Completions.ChatCompletion): CompletionUsage | null {
  const u = response.usage;
  if (!u) return null;
  const pt = u.prompt_tokens ?? 0;
  const ct = u.completion_tokens ?? 0;
  if (pt === 0 && ct === 0) return null;
  return { promptTokens: pt, completionTokens: ct };
}

function finalizeUsage(
  text: string,
  raw: CompletionUsage | null,
  systemPrompt: string,
  history: HistoryMessage[],
  userPrompt: string
): CompletionUsage {
  if (raw && (raw.promptTokens > 0 || raw.completionTokens > 0)) return raw;
  return estimateUsageFromMessages(systemPrompt, history, userPrompt, text);
}

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
  const { referer, title } = openRouterSiteHeaders();
  return {
    client: new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: key,
      defaultHeaders: {
        "HTTP-Referer": referer,
        "X-Title": title,
      },
    }),
    modelId: openRouterModel,
  };
}

export type ModelRoutingOptions = {
  /** When true (or in production), every model id is called via OpenRouter. */
  forceOpenRouter?: boolean;
};

// ── Build an OpenAI-SDK client for any provider ──────────────────────────────
function clientForModel(
  openRouterModel: string,
  keys: UserProviderKeys,
  routing: ModelRoutingOptions = {}
): {
  client: OpenAI;
  modelId: string;
} {
  if (process.env.NODE_ENV === "production" || routing.forceOpenRouter) {
    return clientOpenRouter(openRouterModel, keys);
  }

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
  const { referer, title } = openRouterSiteHeaders();
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    defaultHeaders: {
      "HTTP-Referer": referer,
      "X-Title": title,
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
  userPrompt: string,
  routing: ModelRoutingOptions = {}
): Promise<ModelCallResult> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userPrompt },
  ];
  const { client, modelId } = clientForModel(openRouterModel, keys, routing);

  async function createOnce(forceCompletion: boolean) {
    return client.chat.completions.create({
      model: modelId,
      messages,
      ...outputLimitParams(openRouterModel, forceCompletion),
    });
  }

  try {
    let response: OpenAI.Chat.Completions.ChatCompletion;
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
    const text = response.choices[0]?.message?.content?.trim() ?? "";
    const usage = finalizeUsage(text, usageFromApiResponse(response), systemPrompt, history, userPrompt);
    return { text, usage };
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
      const text = response.choices[0]?.message?.content?.trim() ?? "";
      const usage = finalizeUsage(text, usageFromApiResponse(response), systemPrompt, history, userPrompt);
      return { text, usage };
    }
    throw formatProviderError(err, openRouterModel);
  }
}

/** Forwards string chunks and propagates the inner async generator return value (usage). */
async function* delegateStream(
  source: AsyncGenerator<string, CompletionUsage | null, unknown>
): AsyncGenerator<string, CompletionUsage | null, unknown> {
  while (true) {
    const n = await source.next();
    if (n.done) return (n.value as CompletionUsage | null) ?? null;
    yield n.value as string;
  }
}

/** Stream completion tokens; falls back to one-shot `callModel` if streaming fails. */
export async function* streamModel(
  keys: UserProviderKeys,
  openRouterModel: string,
  systemPrompt: string,
  history: HistoryMessage[],
  userPrompt: string,
  routing: ModelRoutingOptions = {}
): AsyncGenerator<string, CompletionUsage | null, unknown> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user", content: userPrompt },
  ];
  const { client, modelId } = clientForModel(openRouterModel, keys, routing);

  async function* streamChat(
    c: OpenAI,
    apiModel: string,
    fullModelIdForLimits: string,
    forceCompletion: boolean
  ): AsyncGenerator<string, CompletionUsage | null, unknown> {
    const baseParams = {
      model: apiModel,
      messages,
      stream: true as const,
      ...outputLimitParams(fullModelIdForLimits, forceCompletion),
    };
    let stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    try {
      stream = (await c.chat.completions.create({
        ...baseParams,
        stream_options: { include_usage: true },
      })) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    } catch {
      stream = (await c.chat.completions.create(baseParams)) as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    }
    let lastUsage: CompletionUsage | null = null;
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
      const u = chunk.usage;
      if (u && ((u.prompt_tokens ?? 0) > 0 || (u.completion_tokens ?? 0) > 0)) {
        lastUsage = { promptTokens: u.prompt_tokens ?? 0, completionTokens: u.completion_tokens ?? 0 };
      }
    }
    return lastUsage;
  }

  try {
    try {
      return yield* delegateStream(streamChat(client, modelId, openRouterModel, false));
    } catch (err) {
      const { provider } = parseOpenRouterModel(openRouterModel);
      if (provider === "openai" && isOpenAiMaxTokensUnsupportedError(err)) {
        return yield* delegateStream(streamChat(client, modelId, openRouterModel, true));
      }
      throw err;
    }
  } catch (err) {
    if (isModelNotFoundError(err) && openRouterFallbackEnabled()) {
      const fallback = openRouterClient(keys);
      return yield* delegateStream(streamChat(fallback, openRouterModel, openRouterModel, false));
    }
    if (isModelNotFoundError(err) && !openRouterFallbackEnabled()) {
      throw new Error(
        `[${openRouterModel}] Model unavailable on direct provider API. Pick another model or set OPENROUTER_FALLBACK=1.`
      );
    }
    try {
      const { text, usage } = await callModel(keys, openRouterModel, systemPrompt, history, userPrompt, routing);
      if (text) yield text;
      return usage;
    } catch {
      throw formatProviderError(err, openRouterModel);
    }
  }
}
