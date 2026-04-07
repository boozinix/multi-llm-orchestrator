# Multi-LLM Talk

Local web app that drives **Gemini**, **ChatGPT**, **Claude**, and **Perplexity** in a real Chromium window via **Playwright** (no provider API keys). It collects each model’s first answer, picks a random base, then runs a **refinement chain** through the other models so each can improve the draft using its own first-pass answer.

## Requirements

- Node.js 20+
- Accounts on the chat sites you enable

This app does **not** use your normal desktop browser or your “default browser” setting. **Playwright opens its own browser** (bundled Firefox or Chromium) for automation.

If you saw **“Chrome is being controlled by automated test software”** and logins failed, that was **Playwright’s Chromium**. This project defaults to **Firefox** (`PLAYWRIGHT_BROWSER=firefox`) to avoid that banner and reduce login friction.

## Setup

```bash
npm install
```

Save a logged-in session per provider (a headed browser opens; complete login if prompted, then press Enter in the terminal):

```bash
npm run login
```

Log in one site at a time:

```bash
npm run login gemini
npm run login chatgpt
npm run login claude
npm run login perplexity
```

Session files are stored under `.playwright/` (see `.gitignore`).

## Run

```bash
npm run dev
```

Open **http://localhost:3847** (override with `PORT`).

Production-style:

```bash
npm run build
npm start
```

## Configuration (environment)

| Variable | Default | Meaning |
| -------- | ------- | ------- |
| `PORT` | `3847` | HTTP port |
| `PLAYWRIGHT_BROWSER` | `firefox` | `firefox` or `chromium` — which bundled browser Playwright uses |
| `HEADLESS` | off | Set `1` to run the automation browser headless (often worse with bot checks) |
| `STORAGE_DIR` | `.playwright` | Where Playwright `storageState` JSON files live |
| `ENABLED_PROVIDERS` | all four | Comma list: `gemini,chatgpt,claude,perplexity` |
| `PHASE_A_SEQUENTIAL` | off | Set `1` to run Phase A one-by-one instead of parallel |
| `RESPONSE_STABLE_MS` | `2500` | How long reply text must stop changing before it is accepted |
| `RESPONSE_TIMEOUT_MS` | `180000` | Max wait per ask |
| `TYPING_DELAY_MS` | `2` | Reserved for future typing simulation |

## Reliability

Chat UIs change often. If a provider fails, update selectors in `src/providers/extract.ts` and `src/providers/composer.ts`. Prefer testing with **headed** mode and a single provider first.

## Disclaimer

Automating consumer chat UIs may violate terms of service. Use at your own risk for personal experimentation.
