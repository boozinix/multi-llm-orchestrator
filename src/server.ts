import path from "node:path";
import cors from "cors";
import express from "express";
import { config, ensureStorageDir, PROJECT_ROOT, type ProviderId } from "./config.js";
import { hasStorageState } from "./browser.js";
import { runPipeline } from "./orchestrator.js";

ensureStorageDir();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(express.static(path.join(PROJECT_ROOT, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/session-status", (_req, res) => {
  const ids: ProviderId[] = ["gemini", "chatgpt", "claude", "perplexity"];
  const sessions = Object.fromEntries(
    ids.map((id) => [id, hasStorageState(id)])
  ) as Record<ProviderId, boolean>;
  res.json({
    enabledProviders: config.enabledProviders,
    playwrightBrowser: config.playwrightBrowser,
    sessions,
    storageDir: config.storageDir,
  });
});

let pipelineRunning = false;

app.post("/api/run", async (req, res) => {
  const question = req.body?.question;
  if (typeof question !== "string") {
    res.status(400).json({ error: "Expected JSON body `{ question: string }`." });
    return;
  }
  if (pipelineRunning) {
    res.status(409).json({ error: "A run is already in progress." });
    return;
  }
  pipelineRunning = true;
  try {
    const result = await runPipeline(question);
    res.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: message });
  } finally {
    pipelineRunning = false;
  }
});

app.listen(config.port, () => {
  console.log(
    `Multi-LLM Talk UI → http://localhost:${config.port}\n` +
      `Automation browser: ${config.playwrightBrowser} (PLAYWRIGHT_BROWSER)\n` +
      `Storage: ${config.storageDir}\n` +
      `Run \`npm run login\` once per provider to save browser sessions.`
  );
});
