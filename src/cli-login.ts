import fs from "node:fs";
import readline from "node:readline";
import { config, ensureStorageDir, storagePath, type ProviderId } from "./config.js";
import { launchBrowserWithHeadless } from "./browser.js";
import { getProvider } from "./providers/registry.js";

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

function parseArg(): ProviderId[] | null {
  const a = process.argv[2]?.trim();
  if (!a) return null;
  const id = a.toLowerCase();
  if (
    id === "gemini" ||
    id === "chatgpt" ||
    id === "claude" ||
    id === "perplexity"
  ) {
    return [id];
  }
  console.error(
    `Unknown provider "${a}". Use one of: gemini, chatgpt, claude, perplexity`
  );
  process.exit(1);
}

async function main(): Promise<void> {
  ensureStorageDir();
  const targets = parseArg() ?? (["gemini", "chatgpt", "claude", "perplexity"] as ProviderId[]);

  console.log(
    `Using Playwright ${config.playwrightBrowser} (set PLAYWRIGHT_BROWSER=firefox|chromium).\n`
  );

  const browser = await launchBrowserWithHeadless(false);

  for (const id of targets) {
    const out = storagePath(id);
    const mod = getProvider(id);
    const hasFile = fs.existsSync(out);

    const context = hasFile
      ? await browser.newContext({
          storageState: out,
          viewport: { width: 1360, height: 900 },
        })
      : await browser.newContext({ viewport: { width: 1360, height: 900 } });

    const page = await context.newPage();
    console.log(`\nOpening ${mod.label} (${mod.baseUrl})…`);
    await page.goto(mod.baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });

    await ask(
      `Log in to ${mod.label} in the browser window if needed, then press Enter here to save session…`
    );

    await context.storageState({ path: out });
    console.log(`Saved: ${out}`);
    await page.close();
    await context.close();
  }

  await browser.close();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
