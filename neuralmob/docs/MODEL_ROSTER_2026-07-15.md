# NeuralMob Model Roster — Verified 2026-07-15

**Source:** live query to `https://openrouter.ai/api/v1/models` on 2026-07-15.
**Rule:** every ID below was returned by OpenRouter's live catalog on this date. Anything not confirmed live is in the "Unverified" section — DO NOT ship it into code.

Prices below are per **1M tokens** (OpenRouter returns per-token; multiplied by 1,000,000).

---

## Flagship (🥇) — top-of-line, price no object

| Display Name | OpenRouter ID | Input $/1M | Output $/1M | Context | Reasoning | Notes |
|---|---|---|---|---|---|---|
| GPT-5.6 Sol Pro | `openai/gpt-5.6-sol-pro` | 5.00 | 30.00 | 1,050,000 | pro (deep) | OpenAI's top tier; `-pro` variant = higher reasoning effort |
| GPT-5.6 Sol | `openai/gpt-5.6-sol` | 5.00 | 30.00 | 1,050,000 | standard | Same tier without the pro reasoning bump |
| Claude Opus 4.8 | `anthropic/claude-opus-4.8` | 5.00 | 25.00 | 1,000,000 | optional | Current Anthropic top; balanced pricing |
| Claude Fable 5 | `anthropic/claude-fable-5` | 10.00 | 50.00 | 1,000,000 | optional | Premium Anthropic — highest capability, highest cost |
| Grok 4.5 | `x-ai/grok-4.5` | 2.00 | 6.00 | 500,000 | optional | xAI flagship; cheapest of the flagship tier |

Source rows (fetched 2026-07-15 from `openrouter.ai/api/v1/models`):
- `openai/gpt-5.6-sol-pro` → https://openrouter.ai/openai/gpt-5.6-sol-pro
- `openai/gpt-5.6-sol` → https://openrouter.ai/openai/gpt-5.6-sol
- `anthropic/claude-opus-4.8` → https://openrouter.ai/anthropic/claude-opus-4.8
- `anthropic/claude-fable-5` → https://openrouter.ai/anthropic/claude-fable-5
- `x-ai/grok-4.5` → https://openrouter.ai/x-ai/grok-4.5

---

## Balanced (⚖️) — mid-tier price/perf, sensible defaults

| Display Name | OpenRouter ID | Input $/1M | Output $/1M | Context | Reasoning | Notes |
|---|---|---|---|---|---|---|
| GPT-5.6 Terra Pro | `openai/gpt-5.6-terra-pro` | 2.50 | 15.00 | 1,050,000 | pro | OpenAI mid tier |
| GPT-5.6 Terra | `openai/gpt-5.6-terra` | 2.50 | 15.00 | 1,050,000 | standard |  |
| Claude Sonnet 5 | `anthropic/claude-sonnet-5` | 2.00 | 10.00 | 1,000,000 | optional | Latest Sonnet |
| Gemini 3.5 Flash | `google/gemini-3.5-flash` | 1.50 | 9.00 | 1,048,576 | optional | Latest Google balanced |
| Grok 4.3 | `x-ai/grok-4.3` | 1.25 | 2.50 | 1,000,000 | optional | Older Grok, cheaper, 1M ctx |
| Mistral Medium 3.5 | `mistralai/mistral-medium-3.5` | 1.50 | 7.50 | 262,144 | optional | EU option |

Sources:
- `openai/gpt-5.6-terra*` → https://openrouter.ai/openai/gpt-5.6-terra
- `anthropic/claude-sonnet-5` → https://openrouter.ai/anthropic/claude-sonnet-5
- `google/gemini-3.5-flash` → https://openrouter.ai/google/gemini-3.5-flash
- `x-ai/grok-4.3` → https://openrouter.ai/x-ai/grok-4.3
- `mistralai/mistral-medium-3.5` → https://openrouter.ai/mistralai/mistral-medium-3.5

---

## Budget (💰) — cheapest usable

| Display Name | OpenRouter ID | Input $/1M | Output $/1M | Context | Reasoning | Notes |
|---|---|---|---|---|---|---|
| GPT-5.6 Luna Pro | `openai/gpt-5.6-luna-pro` | 1.00 | 6.00 | 1,050,000 | pro |  |
| GPT-5.6 Luna | `openai/gpt-5.6-luna` | 1.00 | 6.00 | 1,050,000 | standard |  |
| Gemini 3.1 Flash Lite | `google/gemini-3.1-flash-lite` | 0.25 | 1.50 | 1,048,576 | optional | Cheapest Google |
| Qwen 3.7 Plus | `qwen/qwen3.7-plus` | 0.32 | 1.28 | 1,000,000 | optional | Cheap Chinese |
| MiniMax M3 | `minimax/minimax-m3` | 0.30 | 1.20 | 1,048,576 | optional | Cheap Chinese, big context |

Sources:
- `openai/gpt-5.6-luna*` → https://openrouter.ai/openai/gpt-5.6-luna
- `google/gemini-3.1-flash-lite` → https://openrouter.ai/google/gemini-3.1-flash-lite
- `qwen/qwen3.7-plus` → https://openrouter.ai/qwen/qwen3.7-plus
- `minimax/minimax-m3` → https://openrouter.ai/minimax/minimax-m3

---

## Experimental / Chinese (🧪 / 🌏) — diversity picks

| Display Name | OpenRouter ID | Input $/1M | Output $/1M | Context | Reasoning | Notes |
|---|---|---|---|---|---|---|
| Qwen 3.7 Max | `qwen/qwen3.7-max` | 1.25 | 3.75 | 1,000,000 | optional | Alibaba flagship |
| Kimi K2.7 Code | `moonshotai/kimi-k2.7-code` | 0.72 | 3.49 | 262,144 | optional | Moonshot; strong at code / agentic |
| GLM 5.2 | `z-ai/glm-5.2` | 0.86 | 2.70 | 1,048,576 | optional | Zhipu (Chinese) |

Sources:
- `qwen/qwen3.7-max` → https://openrouter.ai/qwen/qwen3.7-max
- `moonshotai/kimi-k2.7-code` → https://openrouter.ai/moonshotai/kimi-k2.7-code
- `z-ai/glm-5.2` → https://openrouter.ai/z-ai/glm-5.2

---

## Recommended default 3-model preset (cross-provider diversity)

| Slot | Model | Why |
|---|---|---|
| bot1 | `openai/gpt-5.6-terra` | OpenAI balanced — broadest general capability at $2.50/$15 |
| bot2 | `anthropic/claude-sonnet-5` | Anthropic balanced — strong reasoning/writing, different lineage from OpenAI |
| bot3 | `google/gemini-3.5-flash` | Google balanced — 1M+ context, different training signal, native multimodal |
| synth (judge) | `anthropic/claude-opus-4.8` | Higher-capability judge synthesizing three independent outputs |

Free-tier default (all Budget-tier, no Anthropic/OpenAI premium slots):

| Slot | Model |
|---|---|
| bot1 | `google/gemini-3.1-flash-lite` |
| bot2 | `qwen/qwen3.7-plus` |
| bot3 | `minimax/minimax-m3` |
| synth | `google/gemini-3.1-flash-lite` |

---

## Fast / Regular / Pro — reasoning-effort mapping

NeuralMob will expose one toggle mapped to OpenRouter's unified `reasoning.effort` field
(per https://openrouter.ai/docs/use-cases/reasoning-tokens):

| UI label | `reasoning.effort` | Behavior |
|---|---|---|
| Fast | `low` | Minimal or no reasoning tokens; fastest, cheapest |
| Regular *(default)* | `medium` | Balanced; default |
| Pro | `high` | Maximum deliberation; more reasoning tokens billed |

**Provider notes:**
- OpenAI `-pro` variants (`gpt-5.6-*-pro`) are already reasoning-heavy at model level. Passing `effort=high` compounds the effect; `effort=low` is honored but the model still emits some reasoning.
- Anthropic models accept `reasoning.effort`; some tiers bill thinking tokens separately.
- Grok, Gemini, Qwen, Kimi, GLM, MiniMax on OpenRouter today accept the unified parameter; effort is best-effort — some just ignore `low`.
- **Always-on reasoning:** none of the currently-listed models are strictly reasoning-only (i.e. no `o1`-style "you cannot disable thinking"). If future reasoners appear, treat `low` as "shortest allowed" not "off".

Recommended default: **Regular / `medium`**.

---

## Web-search grounding

Enable per-request via OpenRouter's `:online` model-ID suffix (simplest) — e.g. call
`anthropic/claude-sonnet-5:online`. This activates OpenRouter's web plugin for that call.
Docs: https://openrouter.ai/docs/features/web-search

**Default: OFF** (adds cost per call). Expose as an explicit toggle in the run controls.

---

## Unverified / excluded from this pass

These providers or IDs I could NOT confirm live on OpenRouter today. Do NOT add to code:

- `deepseek/*` — no matches returned by `/api/v1/models` in either fetch. DeepSeek may have delisted from OpenRouter or the WebFetch summarization dropped them. Re-verify manually with `curl https://openrouter.ai/api/v1/models | jq '.data[] | select(.id | startswith("deepseek/"))'` before adding.
- `meta-llama/*` — same status. Excluded.
- `zhipuai/*` — no matches (note: Zhipu ships as `z-ai/*` on OpenRouter — `z-ai/glm-5.2` IS verified above).
- Any `openai/gpt-4.1`, `openai/o1`, `openai/o3`, `anthropic/claude-opus-4.7`, `anthropic/claude-sonnet-4.5`, `google/gemini-2.5-*` — these older IDs from the codebase's `LEGACY_MODEL_ALIASES` map did not appear in today's catalog and may be delisted. Keep them in the alias map pointing at the closest verified successor so saved user configs still resolve, but do NOT list them in `OPENROUTER_MODELS`.

---

## Freshness

- Verified: 2026-07-15
- Re-verify before every production release. `graphify update .` does not check model IDs — this is a manual step against OpenRouter's live catalog.
- Consider a scheduled script (`/loop` or a cron) to re-fetch monthly and diff against this file.
