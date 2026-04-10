"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";
import { AppIcon } from "@/components/app-icon";
import { useSettingsStore, type ProviderKeyId } from "@/store/settings-store";
import { GROUPED_MODELS, filterGroupedModels, clampModelConfigToAllowed } from "@/lib/constants";
import type { ModelConfig } from "@/lib/types";
import type { UserProviderKeys } from "@/lib/provider-keys";

const MODEL_SLOTS: { key: keyof ModelConfig; label: string }[] = [
  { key: "bot1", label: "Bot 1" },
  { key: "bot2", label: "Bot 2" },
  { key: "bot3", label: "Bot 3" },
  { key: "synth", label: "Synthesis" },
];

const KEY_ROWS: {
  id: ProviderKeyId;
  title: string;
  hint: string;
  href: string;
}[] = [
  {
    id: "openai",
    title: "OpenAI",
    hint: "GPT-5, GPT-5.1, GPT-4.1",
    href: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    title: "Anthropic",
    hint: "Claude Sonnet, Opus, Haiku",
    href: "https://console.anthropic.com/settings/keys",
  },
  { id: "xai", title: "xAI", hint: "Grok 3, Grok 3 Mini", href: "https://console.x.ai/" },
  {
    id: "deepseek",
    title: "DeepSeek",
    hint: "DeepSeek Chat, Reasoner",
    href: "https://platform.deepseek.com/",
  },
  {
    id: "openrouter",
    title: "OpenRouter",
    hint: "Gemini, Qwen, Kimi, Mistral, …",
    href: "https://openrouter.ai/keys",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { providerKeys, setProviderKeys, models, setModel, setModels, useOpenRouterDev, setUseOpenRouterDev } =
    useSettingsStore();
  const [draft, setDraft] = useState<UserProviderKeys>(providerKeys);
  const [showSecrets, setShowSecrets] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState({
    mode: "daily" as string | undefined,
    runs: 0,
    apiCalls: 0,
    runLimit: 10,
    apiCallLimit: 30,
    credit_balance_cents: undefined as number | undefined,
    reserved_credit_cents: undefined as number | undefined,
    available_credit_cents: undefined as number | undefined,
    free_runs_remaining: undefined as number | undefined,
  });
  const [modelGroups, setModelGroups] = useState(GROUPED_MODELS);
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<ProviderKeyId | null>(null);
  const [topupLoading, setTopupLoading] = useState<number | null>(null);
  const [billing, setBilling] = useState<{
    tier: string;
    credit_balance_cents: number;
    reserved_credit_cents?: number;
    available_credit_cents?: number;
    lifetime_calls: number;
    owner_unlimited?: boolean;
    recent_events: {
      id: string;
      model: string;
      prompt_tokens: number;
      completion_tokens: number;
      cost_cents: number;
      created_at: number;
    }[];
  } | null>(null);

  useEffect(() => {
    setDraft(providerKeys);
  }, [providerKeys]);

  useEffect(() => {
    fetch("/api/showcase")
      .then((r) => r.json())
      .then((d: { showcase?: boolean }) => setShowcaseMode(Boolean(d.showcase)))
      .catch(() => setShowcaseMode(false));
  }, []);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        if (d.runs === undefined) return;
        setUsage({
          mode: d.mode,
          runs: d.runs ?? 0,
          apiCalls: d.apiCalls ?? 0,
          runLimit: d.runLimit ?? 10,
          apiCallLimit: d.apiCallLimit ?? 30,
          credit_balance_cents: d.credit_balance_cents,
          reserved_credit_cents: d.reserved_credit_cents,
          available_credit_cents: d.available_credit_cents,
          free_runs_remaining: d.free_runs_remaining,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.tier === "string") setBilling(d);
        if (
          d?.billing_enforced &&
          d.tier === "free" &&
          !d.owner_unlimited &&
          Array.isArray(d.free_model_ids)
        ) {
          const allowed = new Set<string>(d.free_model_ids);
          setModelGroups(filterGroupedModels(allowed));
          setModels(clampModelConfigToAllowed(useSettingsStore.getState().models, allowed));
        } else {
          setModelGroups(GROUPED_MODELS);
        }
      })
      .catch(() => {
        setBilling(null);
        setModelGroups(GROUPED_MODELS);
      });
  }, [setModels]);

  const handleSave = useCallback(() => {
    setProviderKeys(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [draft, setProviderKeys]);

  const handleDiscard = useCallback(() => {
    setDraft(providerKeys);
  }, [providerKeys]);

  async function handleSignOut() {
    await signOut({ redirectUrl: "/workspace" });
  }

  async function handleTopUp(amountCents: number) {
    try {
      setTopupLoading(amountCents);
      const res = await fetch("/api/billing/top-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout");
      }
      window.location.href = data.url;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to start top-up");
    } finally {
      setTopupLoading(null);
    }
  }

  const runPct =
    usage.runLimit > 0
      ? Math.min(100, (usage.runs / usage.runLimit) * 100)
      : usage.mode === "owner_unlimited"
        ? 100
        : 0;
  const apiPct =
    usage.apiCallLimit > 0 ? Math.min(100, (usage.apiCalls / usage.apiCallLimit) * 100) : 0;

  const configuredCount = KEY_ROWS.filter((r) => draft[r.id]?.trim()).length;

  return (
    <div className="flex min-h-[100dvh] lg:h-screen overflow-hidden bg-[#0b1326] app-shell">
      <aside className="h-screen w-72 fixed left-0 top-0 bg-[linear-gradient(180deg,rgba(11,19,38,0.94),rgba(9,16,30,0.98))] flex-col p-4 z-50 hidden lg:flex border-r border-white/6 backdrop-blur-xl">
        <div className="mb-8 px-2 pt-1 flex items-center gap-3">
          <BrandMark className="w-11 h-11 rounded-2xl flex-shrink-0" />
          <div className="min-w-0">
            <p className="app-eyebrow mb-1">Neural Mob</p>
            <h1 className="text-[1.75rem] leading-none font-semibold text-[#edf2ff]">Settings</h1>
            <p className="mt-1 text-[11px] text-[#b9c5df]/72">Provider keys, routing, and model mapping</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1.5">
          <p className="app-eyebrow px-3 pb-1 text-[#aeb9d5]/56">Navigate</p>
          <button
            type="button"
            onClick={() => router.push("/workspace")}
            className="w-full min-h-11 text-[#96a5c6] rounded-2xl flex items-center gap-3 px-3.5 py-3 font-medium text-sm text-left hover:bg-[#1a2237] hover:text-[#edf2ff] transition-colors"
          >
            <AppIcon name="chat" className="h-5 w-5" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="w-full min-h-11 app-panel-soft text-[#e6dcff] rounded-2xl flex items-center gap-3 px-3.5 py-3 font-semibold text-sm text-left transition-colors"
          >
            <AppIcon name="settings" className="h-5 w-5" />
            Settings
          </button>
          {billing?.owner_unlimited && (
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="w-full min-h-11 text-[#7cefc0] rounded-2xl flex items-center gap-3 px-3.5 py-3 font-medium text-sm text-left hover:bg-[#132335] transition-colors"
            >
              <AppIcon name="admin" className="h-5 w-5" />
              Admin
            </button>
          )}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="app-panel rounded-[1.4rem] p-4">
            <div className="flex justify-between mb-2">
              <span className="app-eyebrow text-[#b9c5df]/66">Usage</span>
              <span className="text-[11px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usage.runs}/{usage.runLimit}</span>
            </div>
            <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${runPct}%`, background: "linear-gradient(90deg, #d0bcff 0%, #a078ff 56%, #7b5de9 100%)" }} />
            </div>
          </div>
          <button type="button" onClick={handleSignOut} className="w-full min-h-11 flex items-center gap-3 px-3.5 py-3 text-sm text-[#9aa8c7] hover:text-[#edf2ff] hover:bg-[#161f33] rounded-2xl transition-colors">
            <AppIcon name="logout" className="h-[1.05rem] w-[1.05rem]" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:ml-72 flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <header className="sticky top-0 z-40 flex justify-between items-center gap-2 px-4 sm:px-6 min-h-14 py-3 lg:px-8 lg:h-16 lg:min-h-0 bg-[#0b1326]/95 backdrop-blur-xl border-b border-white/6 safe-top">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <div>
              <p className="app-eyebrow mb-1">Configuration</p>
              <h2 className="font-semibold text-[#edf2ff] text-sm sm:text-base truncate">Provider access and routing</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/workspace")}
            className="shrink-0 min-h-10 px-3 sm:px-4 py-2 text-sm font-semibold text-[#edf2ff] rounded-xl app-panel-soft"
          >
            Chat
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 lg:px-8 lg:py-8 pb-mobile-nav">
          <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
            <section className="app-panel rounded-[2rem] p-6 sm:p-8">
              <p className="app-eyebrow mb-3">Control Deck</p>
              <h3 className="app-hero-title text-4xl sm:text-5xl text-[#edf2ff] max-w-2xl">Tune how Neural Mob routes, bills, and assigns models.</h3>
              <p className="mt-4 text-[#b4bed6] max-w-2xl leading-8">
                Keep this page simple: configure provider access, choose your routing mode, then save model assignments for each bot and synthesis stage.
              </p>
            </section>
            {showcaseMode && (
              <div className="px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-100/95 text-sm leading-snug">
                <span className="font-semibold">Showcase mode</span>
                <span className="text-amber-100/80"> — LLM calls are disabled on this deployment.</span>
              </div>
            )}

            {process.env.NODE_ENV === "development" && (
              <div className="app-panel-soft px-5 py-4 rounded-[1.5rem] text-sm text-[#dae2fd]">
                <div className="font-semibold text-[#d0bcff] mb-2">Local routing</div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useOpenRouterDev}
                    onChange={(e) => setUseOpenRouterDev(e.target.checked)}
                    className="mt-1 rounded border-[#494454] text-[#a078ff] focus:ring-[#d0bcff]/40"
                  />
                  <span className="text-[#cbc3d7] leading-snug">
                    <span className="text-[#dae2fd] font-medium">Use OpenRouter</span> — all models (
                    <code className="text-[11px] text-[#d0bcff]">openai/</code>,{" "}
                    <code className="text-[11px] text-[#d0bcff]">anthropic/</code>, etc.) go through OpenRouter using{" "}
                    <code className="text-[11px] text-[#d0bcff]">OPENROUTER_API_KEY</code> from{" "}
                    <code className="text-[11px] text-[#d0bcff]">.env.local</code> (or the browser key if set).
                    Uncheck to call each provider directly with keys from Settings /{" "}
                    <code className="text-[11px]">.env.local</code> (<code className="text-[11px]">BYOK_ONLY=0</code>{" "}
                    helps for env keys).
                  </span>
                </label>
              </div>
            )}

            {billing && !showcaseMode && (
              <div className="app-panel rounded-[1.75rem] p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[#dae2fd]">Billing</h3>
                  <span className="text-xs font-mono uppercase tracking-wider text-[#d0bcff]/80">
                    {billing.owner_unlimited ? "Owner" : billing.tier === "paid" ? "Paid" : "Free"}
                  </span>
                </div>
                {billing.owner_unlimited && (
                  <p className="text-sm text-[#4edea3]/95 rounded-lg border border-[#4edea3]/25 bg-[#4edea3]/10 px-3 py-2">
                    Owner bypass active — no usage limits or charges (set{" "}
                    <code className="text-[11px] text-[#d0bcff]">OWNER_UNLIMITED_EMAILS</code> on the server).
                  </p>
                )}
                {!billing.owner_unlimited && billing.tier === "free" && (
                  <p className="text-sm text-[#cbc3d7]">
                    Free users get starter credit and only low-cost models on production. Top up to unlock the full model catalog.
                  </p>
                )}
                {!billing.owner_unlimited && billing.tier === "paid" && (
                  <p className="text-sm text-[#cbc3d7]">
                    Available:{" "}
                    <span className="font-mono text-[#d0bcff]">
                      ${((billing.available_credit_cents ?? billing.credit_balance_cents) / 100).toFixed(2)}
                    </span>{" "}
                    remaining
                  </p>
                )}
                {!billing.owner_unlimited && !showcaseMode && (
                  <div className="flex flex-wrap gap-2">
                    {[500, 1000, 2000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => void handleTopUp(amount)}
                        disabled={topupLoading !== null}
                        className="min-h-10 px-4 rounded-xl text-sm font-medium bg-[#222a3d] text-[#d0bcff] border border-[#d0bcff]/20 hover:bg-[#2d3449] disabled:opacity-60 disabled:cursor-wait"
                      >
                        {topupLoading === amount ? "Redirecting…" : `Top up $${(amount / 100).toFixed(0)}`}
                      </button>
                    ))}
                  </div>
                )}
                {billing.recent_events.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="text-xs text-[#cbc3d7]/70 mb-2">Recent usage (server, production billing)</div>
                    <table className="w-full text-left text-xs text-[#cbc3d7]">
                      <thead>
                        <tr className="border-b border-[#494454]/20 text-[#94a3b8]">
                          <th className="py-2 pr-2 font-medium">Date</th>
                          <th className="py-2 pr-2 font-medium">Model</th>
                          <th className="py-2 pr-2 font-medium">Tokens</th>
                          <th className="py-2 font-medium">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billing.recent_events.map((ev) => (
                          <tr key={ev.id} className="border-b border-[#494454]/10">
                            <td className="py-2 pr-2 font-mono whitespace-nowrap">
                              {new Date(ev.created_at).toLocaleString()}
                            </td>
                            <td className="py-2 pr-2 font-mono truncate max-w-[140px]" title={ev.model}>
                              {ev.model}
                            </td>
                            <td className="py-2 pr-2 font-mono">
                              {ev.prompt_tokens}+{ev.completion_tokens}
                            </td>
                            <td className="py-2 font-mono">${(ev.cost_cents / 100).toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-[#c3cbe0] leading-relaxed app-panel-soft rounded-[1.5rem] px-5 py-4">
              Keys stay in <strong className="text-[#dae2fd] font-medium">this browser</strong> until you save. They are sent to this app only when you send a chat message, to forward to the provider. Add only the providers you use — e.g. Anthropic + OpenRouter for Gemini; DeepSeek stays off until you add a DeepSeek key.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#cbc3d7]/70">
              <span className="font-mono">{configuredCount}/{KEY_ROWS.length} keys filled</span>
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="min-h-9 px-3 rounded-lg bg-[#222a3d] text-[#d0bcff] text-xs font-medium"
              >
                {showSecrets ? "Hide" : "Show"} secrets
              </button>
            </div>

            {/* Mobile: accordion */}
            <div className="lg:hidden space-y-2">
              {KEY_ROWS.map((row) => {
                const open = openAccordion === row.id;
                return (
                  <div key={row.id} className="app-panel rounded-[1.4rem] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenAccordion(open ? null : row.id)}
                      className="w-full min-h-14 flex items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div>
                        <div className="font-semibold text-[#dae2fd]">{row.title}</div>
                        <div className="text-[11px] text-[#cbc3d7]/60">{row.hint}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`w-2 h-2 rounded-full ${draft[row.id]?.trim() ? "bg-[#4edea3]" : "bg-[#ffb4ab]/60"}`} />
                        <AppIcon
                          name={open ? "expandUp" : "expandDown"}
                          className="h-[1.05rem] w-[1.05rem] text-[#cbc3d7]"
                        />
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 pt-0 border-t border-[#494454]/10">
                        <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#d0bcff] underline mb-3 inline-block min-h-8 leading-8">
                          Get API key →
                        </a>
                        <input
                          type={showSecrets ? "text" : "password"}
                          autoComplete="off"
                          value={draft[row.id]}
                          onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                          placeholder={`Paste ${row.title} key`}
                          className="w-full min-h-12 bg-[#060e20] rounded-xl px-4 py-3 text-[#dae2fd] text-base border-none outline-none focus:ring-2 focus:ring-[#d0bcff]/30 font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: all visible */}
            <div className="hidden lg:block space-y-4">
              {KEY_ROWS.map((row) => (
                <div key={row.id} className="app-panel rounded-[1.6rem] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-base font-bold text-[#dae2fd]">{row.title}</h4>
                      <p className="text-xs text-[#cbc3d7]/60 mt-0.5">{row.hint}</p>
                    </div>
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#d0bcff] border border-[#d0bcff]/20 px-3 py-1.5 rounded-full hover:bg-[#d0bcff]/10 font-mono shrink-0 min-h-9 inline-flex items-center"
                    >
                      Get key →
                    </a>
                  </div>
                  <input
                    type={showSecrets ? "text" : "password"}
                    autoComplete="off"
                    value={draft[row.id]}
                    onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                    placeholder={`Paste ${row.title} API key`}
                    className="w-full min-h-11 bg-[#060e20] rounded-xl px-4 py-3 text-[#dae2fd] text-sm border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40 font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="app-panel rounded-[1.75rem] p-5 sm:p-6">
              <h4 className="text-base font-bold text-[#dae2fd] mb-1">Models</h4>
              <p className="text-xs text-[#cbc3d7]/70 mb-4">Per-slot assignments (large touch targets on phone).</p>
              <div className="space-y-4">
                {MODEL_SLOTS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-[10px] uppercase tracking-wider text-[#cbc3d7] mb-2 font-mono">{label}</label>
                    <select
                      value={models[key]}
                      onChange={(e) => setModel(key, e.target.value)}
                      className="w-full min-h-12 bg-[#060e20] text-[#dae2fd] rounded-xl px-4 py-3 text-base sm:text-sm border-none outline-none focus:ring-2 focus:ring-[#d0bcff]/30 font-mono"
                    >
                      {modelGroups.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                          {g.models.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-1 gap-4">
              <div className="app-panel rounded-[1.8rem] p-6">
                <h3 className="font-semibold text-[#dae2fd] mb-4">
                  {usage.mode === "paid_credits"
                      ? "Credits"
                      : usage.mode === "free_credits"
                        ? "Starter credit"
                      : usage.mode === "owner_unlimited"
                        ? "Usage"
                        : "Daily usage"}
                </h3>
                <div className="space-y-3">
                  {usage.mode === "daily" && (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[#cbc3d7]">Runs</span>
                          <span className="text-[#d0bcff] font-mono">
                            {usage.runs}/{usage.runLimit}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${runPct}%`,
                              background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[#cbc3d7]">API calls</span>
                          <span className="text-[#d0bcff] font-mono">
                            {usage.apiCalls}/{usage.apiCallLimit}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${apiPct}%`, background: "linear-gradient(135deg, #4edea3 0%, #00a572 100%)" }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  {usage.mode === "free_credits" && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#cbc3d7]">Available free credit</span>
                        <span className="text-[#d0bcff] font-mono">
                          ${((usage.available_credit_cents ?? usage.credit_balance_cents ?? 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(usage.available_credit_cents ?? usage.credit_balance_cents ?? 0) > 0 ? 100 : 0}%`,
                            background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                          }}
                        />
                      </div>
                      <p className="text-xs text-[#cbc3d7]/70 mt-2">Only low-cost models until you top up.</p>
                    </div>
                  )}
                  {usage.mode === "paid_credits" && (
                    <p className="text-sm text-[#dae2fd]">
                      Available:{" "}
                      <span className="font-mono text-[#d0bcff]">
                        ${((usage.available_credit_cents ?? usage.credit_balance_cents ?? 0) / 100).toFixed(2)}
                      </span>
                    </p>
                  )}
                  {usage.mode === "owner_unlimited" && (
                    <p className="text-sm text-[#4edea3]">Owner unlimited — no limits applied.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pb-4">
              <button
                type="button"
                onClick={handleDiscard}
                className="min-h-12 px-6 rounded-xl text-sm font-medium text-[#cbc3d7] border border-[#494454]/40 hover:bg-[#222a3d] transition-colors order-2 sm:order-1"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="min-h-12 px-8 rounded-xl text-sm font-bold shadow-lg order-1 sm:order-2"
                style={{
                  background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                  color: "#340080",
                  boxShadow: "0 4px 16px rgba(208,188,255,0.3)",
                }}
              >
                {saved ? "Saved" : "Save keys & models"}
              </button>
            </div>
          </div>
        </main>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t border-white/8 bg-[#10182b]/95 backdrop-blur-xl z-50 safe-bottom pt-1">
        <button type="button" onClick={() => router.push("/workspace")} className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]">
          <AppIcon name="chat" className="h-6 w-6" />
          <span className="text-[10px]">Chat</span>
        </button>
        <button type="button" className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#d0bcff]">
          <AppIcon name="key" className="h-6 w-6" />
          <span className="text-[10px]">Keys</span>
        </button>
        <button type="button" onClick={handleSignOut} className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]">
          <AppIcon name="logout" className="h-6 w-6" />
          <span className="text-[10px]">Out</span>
        </button>
      </div>

      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-[#d0bcff]/[0.04]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full blur-[100px] bg-[#4edea3]/[0.04]" />
      </div>
    </div>
  );
}
