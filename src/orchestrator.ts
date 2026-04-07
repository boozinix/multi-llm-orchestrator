import type { ProviderId } from "./config.js";
import { config } from "./config.js";
import { launchBrowser, newLoggedInContext } from "./browser.js";
import { getProvider, listProviders } from "./providers/registry.js";
import type { ProviderModule } from "./providers/types.js";
import { buildRefinementPrompt } from "./prompts.js";

export type PhaseAResult = {
  answers: Partial<Record<ProviderId, string>>;
  errors: Partial<Record<ProviderId, string>>;
};

export type RefinementStep = {
  provider: ProviderId;
  label: string;
  promptPreview: string;
  text: string;
};

export type PipelineResult = {
  question: string;
  baseModel: ProviderId;
  phaseA: PhaseAResult;
  refinements: RefinementStep[];
  finalAnswer: string;
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function successfulIds(phase: PhaseAResult): ProviderId[] {
  return Object.keys(phase.answers) as ProviderId[];
}

async function runPhaseA(
  browser: Awaited<ReturnType<typeof launchBrowser>>,
  question: string,
  modules: ProviderModule[]
): Promise<PhaseAResult> {
  const answers: Partial<Record<ProviderId, string>> = {};
  const errors: Partial<Record<ProviderId, string>> = {};

  const opts = {
    responseStableMs: config.responseStableMs,
    responseTimeoutMs: config.responseTimeoutMs,
    typingDelayMs: config.typingDelayMs,
  };

  const runOne = async (mod: ProviderModule) => {
    const ctx = await newLoggedInContext(browser, mod.id);
    const page = await ctx.newPage();
    try {
      const text = await mod.ask({ page, context: ctx, prompt: question, opts });
      answers[mod.id] = text;
    } catch (e) {
      errors[mod.id] = e instanceof Error ? e.message : String(e);
    } finally {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
    }
  };

  if (config.parallelPhaseA) {
    await Promise.all(modules.map((m) => runOne(m)));
  } else {
    for (const m of modules) {
      await runOne(m);
    }
  }

  return { answers, errors };
}

export async function runPipeline(question: string): Promise<PipelineResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Question is empty.");
  }

  const modules = listProviders(config.enabledProviders);
  const browser = await launchBrowser();

  try {
    const phaseA = await runPhaseA(browser, trimmed, modules);
    const ok = successfulIds(phaseA);
    if (ok.length === 0) {
      const errText = JSON.stringify(phaseA.errors, null, 2);
      throw new Error(`All enabled providers failed. Errors:\n${errText}`);
    }

    const baseModel = ok[Math.floor(Math.random() * ok.length)]!;
    let draft = phaseA.answers[baseModel]!;
    const others = shuffle(ok.filter((id) => id !== baseModel));

    const opts = {
      responseStableMs: config.responseStableMs,
      responseTimeoutMs: config.responseTimeoutMs,
      typingDelayMs: config.typingDelayMs,
    };

    const refinements: RefinementStep[] = [];

    for (const pid of others) {
      const mod = getProvider(pid);
      const ownFirst = phaseA.answers[pid];
      if (!ownFirst) continue;

      const prompt = buildRefinementPrompt({
        userQuestion: trimmed,
        draft,
        ownFirstAnswer: ownFirst,
        providerLabel: mod.label,
      });

      const ctx = await newLoggedInContext(browser, pid);
      const page = await ctx.newPage();
      try {
        const text = await mod.ask({
          page,
          context: ctx,
          prompt,
          opts,
        });
        refinements.push({
          provider: pid,
          label: mod.label,
          promptPreview: prompt.slice(0, 280) + (prompt.length > 280 ? "…" : ""),
          text,
        });
        draft = text;
      } finally {
        await page.close().catch(() => {});
        await ctx.close().catch(() => {});
      }
    }

    return {
      question: trimmed,
      baseModel,
      phaseA,
      refinements,
      finalAnswer: draft,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
