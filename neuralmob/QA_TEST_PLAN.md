# NeuralMob Internal QA Test Plan
**Version:** 1.0  
**Scope:** Chain mode, Super mode, all production models, Simple/Advanced output, scroll/streaming UX  
**Environment:** localhost:3040 (dev) and neuralmob.xyz (production)

---

## 1. Pre-flight Checklist

Before running any test, verify:

- [ ] Dev server running on port 3040 (`npm run dev`)
- [ ] OpenRouter API key set in Settings (required for most new models in dev)
- [ ] "Use OpenRouter" toggle ON in Settings (forces all models through OR — easier for dev)
- [ ] At least one of: Anthropic, OpenAI, xAI, Google, DeepSeek direct key configured
- [ ] Browser console open — watch for errors
- [ ] Network tab open — confirm POST /api/chat returns 200

---

## 2. Model Coverage Matrix

| # | Model ID | Provider | Label | Test Priority |
|---|----------|----------|-------|---------------|
| 1 | `anthropic/claude-opus-4.7` | Anthropic | Claude Opus 4.7 | P0 |
| 2 | `anthropic/claude-sonnet-4.6` | Anthropic | Claude Sonnet 4.6 | P0 |
| 3 | `anthropic/claude-haiku-4.5` | Anthropic | Claude Haiku 4.5 | P1 |
| 4 | `openai/gpt-5.5` | OpenAI | GPT-5.5 | P0 |
| 5 | `openai/gpt-5.4` | OpenAI | GPT-5.4 | P0 |
| 6 | `openai/gpt-5.4-mini` | OpenAI | GPT-5.4 Mini | P1 |
| 7 | `x-ai/grok-4.3` | xAI | Grok 4.3 | P1 |
| 8 | `x-ai/grok-4.20` | xAI | Grok 4.20 | P1 |
| 9 | `google/gemini-3.1-pro-preview` | Google | Gemini 3.1 Pro | P0 |
| 10 | `google/gemini-3.1-flash-lite-preview` | Google | Gemini 3.1 Flash Lite | P1 |
| 11 | `deepseek/deepseek-v4-pro` | DeepSeek | DeepSeek V4 Pro | P0 |
| 12 | `deepseek/deepseek-v4-flash` | DeepSeek | DeepSeek V4 Flash | P1 |
| 13 | `qwen/qwen3-235b-a22b` | Qwen | Qwen 3 235B | P2 |
| 14 | `qwen/qwen3-30b-a3b` | Qwen | Qwen 3 30B | P2 |
| 15 | `moonshotai/kimi-k2` | Moonshot | Kimi K2 | P2 |
| 16 | `mistralai/mistral-large-3` | Mistral | Mistral Large 3 | P2 |
| 17 | `mistralai/mistral-small-3.1-24b-instruct` | Mistral | Mistral Small 3.1 | P2 |

**Priority key:** P0 = must pass before any release. P1 = should pass. P2 = nice to have.

---

## 3. Standard Prompts

### Short Prompts (< 50 tokens, expect < 300 token response)
| ID | Prompt | Expected character |
|----|--------|--------------------|
| S1 | `What is 17 × 23?` | Direct numeric answer |
| S2 | `Name three programming languages invented before 1985.` | Short list |
| S3 | `Translate "good morning" into Japanese.` | Single word/phrase |
| S4 | `What is the capital of Morocco?` | One word |

### Long Prompts (300–600 tokens, expect 800–2000 token response)
| ID | Prompt |
|----|--------|
| L1 | `Write a detailed technical explanation of how HTTPS works, covering TLS handshake, certificate validation, symmetric/asymmetric encryption, and how forward secrecy is achieved. Include a step-by-step breakdown of what happens when a browser connects to a secure site for the first time.` |
| L2 | `You are advising a 10-person startup that has just closed a $2M seed round. Describe a complete go-to-market strategy for a B2B SaaS product targeting mid-market companies in the logistics sector. Cover: positioning, ICP definition, outbound vs inbound, pricing strategy, first 90 days of sales motion, and one key metric to track each month.` |
| L3 | `Compare and contrast microservices architecture vs. monolithic architecture for a greenfield e-commerce platform expecting 1M users in year one. Cover: development velocity, operational complexity, cost, team structure implications, failure modes, and give a final recommendation with justification.` |

### Stress Prompts (600+ tokens, Advanced mode only — expect 2000–8192 token response)
| ID | Prompt |
|----|--------|
| X1 | `Write a complete product requirements document (PRD) for a mobile app that helps small restaurant owners manage reservations, waitlists, and table turnover. Include: executive summary, problem statement, user personas (at least 3), core user stories (at least 10), functional requirements, non-functional requirements, out-of-scope items, success metrics, and a phased rollout plan (3 phases). Be thorough and production-quality.` |
| X2 | `You are a senior engineer reviewing a codebase migration from a REST API to GraphQL for a platform with 50M monthly active users. Write a migration plan that covers: schema design principles, resolver strategy, N+1 problem mitigation, authentication/authorization changes, backwards compatibility during transition, rollout strategy (percentage-based), performance benchmarking approach, and rollback plan. Include code examples where helpful.` |

---

## 4. Super Mode Tests

Super mode runs bots in parallel, then optionally merges results via a synthesis model.

### 4.1 Configuration Variants

| Config | Bot1 | Bot2 | Bot3 | Merge 1+2 | Merge Final | Synth |
|--------|------|------|------|-----------|-------------|-------|
| A — 3-bot full merge | GPT-5.4 | Sonnet 4.6 | Gemini 3.1 Pro | ON | ON | Haiku 4.5 |
| B — 3-bot no merge | GPT-5.4 | Sonnet 4.6 | Gemini 3.1 Pro | OFF | OFF | — |
| C — 2-bot merge | GPT-5.4 | Sonnet 4.6 | disabled | ON | OFF | Haiku 4.5 |
| D — 1-bot (quick-like) | GPT-5.4 | disabled | disabled | OFF | OFF | — |
| E — reasoning models | Grok 4.3 | Opus 4.7 | DeepSeek V4 Pro | ON | ON | Haiku 4.5 |
| F — cheap mix | DeepSeek V4 Flash | Gemini Flash Lite | Mistral Small | ON | ON | Gemini Flash Lite |

### 4.2 Super Mode Test Cases

For each config above, run prompt S2 (short) and L2 (long). Use Simple mode for all unless noted.

| Test ID | Config | Prompt | Mode | Pass Criteria |
|---------|--------|--------|------|---------------|
| SM-01 | A | S2 | Simple | All 3 bots stream concurrently; merge blocks appear; final answer shown |
| SM-02 | A | L2 | Simple | Same as SM-01; all content readable without scroll breakage |
| SM-03 | A | X1 | Advanced | Same; content does not truncate mid-sentence |
| SM-04 | B | S1 | Simple | 3 bot blocks show, no merge block, "Best Answer" selected |
| SM-05 | C | L1 | Simple | 2 bots stream; merge 1+2 fires; output coherent |
| SM-06 | D | S3 | Simple | Single bot responds; no merge; fast |
| SM-07 | E | L3 | Simple | Grok/Opus may take longer; timeout UX (⏱ still waiting) appears if slow start |
| SM-08 | F | L2 | Simple | All free-tier models respond; verify no auth errors |

### 4.3 Super Mode — Skip/Timeout UX

| Test ID | Steps | Pass Criteria |
|---------|-------|---------------|
| SM-09 | Config A, prompt L1. Click "Skip Mind 2" while streaming. | Mind 2 card shows "○ skipped", does not contribute to merge |
| SM-10 | Config E (slow reasoning models), prompt S4. Wait for ⏱ timeout badge. | Yellow "⏱ still waiting" shown; "Wait more" and "Skip" buttons visible |
| SM-11 | SM-10 continued — click "Wait more". | Timer extends, bot eventually responds or times out again |
| SM-12 | SM-10 continued — click "Skip". | Bot marked skipped, merge proceeds with remaining bots |

---

## 5. Chain Mode Tests

Chain mode runs bots sequentially: Bot 1 answers cold, Bot 2 reviews and improves, Bot 3 refines again.

### 5.1 Configuration Variants

| Config | Step 1 | Step 2 | Step 3 |
|--------|--------|--------|--------|
| C-A | GPT-5.4 | Sonnet 4.6 | Gemini 3.1 Pro |
| C-B | DeepSeek V4 Flash | Sonnet 4.6 | — (2-step) |
| C-C | Haiku 4.5 | Haiku 4.5 | Haiku 4.5 |
| C-D | GPT-5.4 | Opus 4.7 | — (2-step) |
| C-E | DeepSeek V4 Pro | GPT-5.4 | Opus 4.7 |
| C-F | Grok 4.3 | Sonnet 4.6 | GPT-5.5 |

### 5.2 Chain Mode — Functional Tests

| Test ID | Config | Prompt | Mode | Pass Criteria |
|---------|--------|--------|------|---------------|
| CM-01 | C-A | S1 | Simple | Step 1 streams; Step 2 starts after Step 1 finishes; Step 3 after Step 2 |
| CM-02 | C-A | L2 | Simple | Same; each step shows full content; scroll works during and after |
| CM-03 | C-A | X1 | Advanced | Steps complete without token truncation; total run completes |
| CM-04 | C-B | S2 | Simple | 2-step chain; progress bar shows Step 1 ✓ → Step 2 streaming |
| CM-05 | C-C | L1 | Simple | Homogeneous models; Step 2 visibly improves over Step 1 |
| CM-06 | C-D | L3 | Simple | GPT-5.4 first pass; Opus reviews and refines; final answer is higher quality |
| CM-07 | C-E | L2 | Simple | DeepSeek V4 Pro step 1 completes (via OpenRouter); chain does not abort |
| CM-08 | C-F | S4 | Simple | Grok 4.3 step 1; Sonnet step 2 confirms rather than over-edits trivial answer |

### 5.3 Chain Mode — Progress Bar and Streaming UX

| Test ID | Steps | Pass Criteria |
|---------|-------|---------------|
| CM-09 | Config C-A, prompt L2. Watch the step progress bar. | Shows ○ → pulsing dot (active) → ✓ for each step in sequence |
| CM-10 | During Step 1 streaming, scroll up to read the beginning. | Scroll works; auto-scroll stops; bottom of content not forced into view |
| CM-11 | During Step 2 streaming, scroll back down. | Auto-scroll resumes and follows new tokens |
| CM-12 | After chain completes, scroll through all 3 step cards. | All content readable; no clipping; correct done/streaming/waiting states |
| CM-13 | Config C-B, prompt X1. During Step 1, check header. | Shows "● streaming" with pulsing dot; switches to "✓ done" when Step 1 ends |
| CM-14 | Config C-A, prompt L2. Observe Step 2 system prompt. | Step 2 receives original prompt + full history + Step 1 answer (verify via longer/better output) |

### 5.4 Chain Mode — Failure Handling

| Test ID | Steps | Pass Criteria |
|---------|-------|---------------|
| CM-15 | Set Step 1 to a model with no API key. Submit. | Error message shown: "Step 1 (model) failed or timed out. Chain stopped." |
| CM-16 | Disable all bots in chain config. Submit. | "No bot slots enabled" error shown clearly |

---

## 6. Quick Mode Tests

| Test ID | Model | Prompt | Mode | Pass Criteria |
|---------|-------|--------|------|---------------|
| QK-01 | GPT-5.4 | S1 | Simple | Response streams; completes; no errors |
| QK-02 | Sonnet 4.6 | L2 | Simple | Full response; no truncation |
| QK-03 | DeepSeek V4 Flash | S3 | Simple | Fast response; correct translation |
| QK-04 | Any | X1 | Advanced | 8192 token cap applies; response not cut off |

---

## 7. Output Mode Tests (Simple vs Advanced)

| Test ID | Mode | Prompt | Expected |
|---------|------|--------|----------|
| OUT-01 | Simple | X1 | Response cuts off around 2000 tokens; may be incomplete |
| OUT-02 | Advanced | X1 | Response continues to natural end; up to 8192 tokens |
| OUT-03 | Toggle Simple→Advanced mid-session | L2 (new message) | New message uses Advanced cap; previous messages unaffected |
| OUT-04 | Advanced, Super full merge | X2 | All 3 bots + 2 merge calls use 8192 cap; cost reflects higher usage |

---

## 8. Conversation History Tests

| Test ID | Steps | Pass Criteria |
|---------|-------|---------------|
| HIS-01 | Ask S1, then follow up "Why is that the answer?" | Follow-up references the original answer; context preserved |
| HIS-02 | Super mode: ask L2. Then ask "Summarize that in one sentence." | Summary correctly reflects the prior multi-bot answer |
| HIS-03 | Chain mode: ask L3. Then ask "What were the main trade-offs you identified?" | References the chain's final answer |
| HIS-04 | Switch model mid-conversation (change Bot 1). Ask follow-up. | New model receives prior conversation history; context intact |
| HIS-05 | Start new conversation. Confirm prior context not present. | New conversation is clean; no cross-contamination |

---

## 9. UI / UX Smoke Tests

| Test ID | Steps | Pass Criteria |
|---------|-------|---------------|
| UX-01 | Switch Quick → Chain → Super → Quick rapidly | Mode toggle updates instantly; FlowDiagram updates; no errors |
| UX-02 | Super mode: toggle bots on/off. Check FlowDiagram. | Diagram reflects enabled bots and merge state correctly |
| UX-03 | Chain mode: toggle steps on/off. Check FlowDiagram. | Chain diagram updates; disabled steps shown dimmed |
| UX-04 | Submit long prompt in Super mode. Scroll up mid-stream. | Scroll works; auto-scroll does not override user scroll |
| UX-05 | Copy button on a bot block. | Text copied to clipboard; button shows "Copied!" briefly |
| UX-06 | Resize browser window during streaming. | Layout reflows; content remains visible |
| UX-07 | Submit while a stream is in progress. | Blocked or queued gracefully; no duplicate requests |
| UX-08 | Open two tabs, same account. Submit in tab 1. | Tab 2 shows new conversation in history after refresh |
| UX-09 | Open Settings. Change a key. Return to workspace. | Keys persist; next request uses updated keys |
| UX-10 | FlowDiagram — Super mode, all 3 bots + full merge. | Shows bot row → merge 1+2 → merge final → output; all arrows correct |
| UX-11 | FlowDiagram — Chain mode, 3 steps. | Shows Step 1 → Step 2 → Step 3 → Output vertically; labels correct |

---

## 10. Known Issues / Watch List

| Issue | Status | Notes |
|-------|--------|-------|
| DeepSeek V4 Pro timeout | Investigating | Confirmed valid OR model ID. Enable "Use OpenRouter" in Settings and retry. May be slow on long prompts. |
| Grok 4.3 slow start | Known | Reasoning model — expect 30–60s before first token. Timeout badge expected. |
| GPT-5.5/5.4 require `max_completion_tokens` | Fixed | `openAiSlugUsesMaxCompletionTokens` handles this. Verify no 400 errors in console. |
| Gemini Flash Lite output truncation | Watch | May cut off at 2000 tokens in Simple mode. Use Advanced for long prompts. |
| Scroll fighting auto-scroll | Fixed (v2) | `isProgrammaticScroll` flag prevents reset of user scroll state. |

---

## 11. Test Execution Log

Copy this table and fill in as you run tests. ✅ = pass, ❌ = fail, ⚠️ = partial/degraded.

| Test ID | Date | Tester | Result | Notes |
|---------|------|--------|--------|-------|
| SM-01 | | | | |
| SM-02 | | | | |
| SM-07 | | | | |
| CM-01 | | | | |
| CM-02 | | | | |
| CM-07 | | | | |
| CM-09 | | | | |
| CM-10 | | | | |
| CM-11 | | | | |
| QK-01 | | | | |
| OUT-01 | | | | |
| OUT-02 | | | | |
| HIS-01 | | | | |
| UX-01 | | | | |
| UX-04 | | | | |

---

## 12. Sign-off Criteria

**Ready to deploy when:**
- All P0 model tests pass in both Chain and Super (SM-01/02, CM-01/02/04/06)
- Scroll fix confirmed working (CM-10, CM-11, UX-04)
- No 500 errors on /api/chat in production logs
- Timeout UX (SM-10) and skip UX (SM-09) work end-to-end
- Output mode toggle (OUT-01, OUT-02) produces visibly different length responses
