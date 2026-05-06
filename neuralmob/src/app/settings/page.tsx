"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";
import { AppIcon } from "@/components/app-icon";
import { useSettingsStore, type ProviderKeyId } from "@/store/settings-store";
import { buildSelectableModelGroups, clampModelConfigToAllowed } from "@/lib/constants";
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
  const [freeModelIds, setFreeModelIds] = useState<string[] | null>(null);
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

  const modelGroups = useMemo(
    () => buildSelectableModelGroups(freeModelIds?.length ? new Set(freeModelIds) : null),
    [freeModelIds]
  );

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
          setFreeModelIds(d.free_model_ids);
          setModels(clampModelConfigToAllowed(useSettingsStore.getState().models, allowed));
        } else {
          setFreeModelIds(null);
        }
      })
      .catch(() => {
        setBilling(null);
        setFreeModelIds(null);
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
    const redirectUrl =
      typeof window !== "undefined" ? `${window.location.origin}/sign-in` : "/sign-in";
    try {
      await signOut({ redirectUrl });
    } finally {
      if (typeof window !== "undefined") {
        window.location.assign("/sign-in");
      }
    }
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
    <div className="flex min-h-[100dvh] bg-[#0b1326] app-shell">
      <aside className="w-60 flex-shrink-0 hidden lg:flex flex-col sticky top-0 h-screen overflow-auto" style={{ borderRight: "1px solid rgba(208,188,255,.1)", padding: "18px 16px" }}>
        {/* Brand */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "4px 6px 14px", borderBottom: "1px dashed rgba(208,188,255,.1)", marginBottom: 16 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#d0bcff,#9d87d9)", display: "grid", placeItems: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#1a0f3a", flexShrink: 0 }}>NM</div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#e9e6f5", letterSpacing: "-0.01em" }}>Neural Mob</div>
        </div>

        {/* Nav */}
        <div className="mb-4">
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6889", margin: "4px 6px 6px", fontWeight: 500 }}>Navigate</p>
          <nav className="space-y-0.5">
            <button type="button" onClick={() => router.push("/workspace")} className="w-full flex justify-between items-center px-2.5 py-2 rounded-lg text-[#a7a2c2] text-[12.5px] hover:bg-white/5 hover:text-[#e9e6f5] transition-colors">Home</button>
            <button type="button" onClick={() => router.push("/workspace")} className="w-full flex justify-between items-center px-2.5 py-2 rounded-lg text-[#a7a2c2] text-[12.5px] hover:bg-white/5 hover:text-[#e9e6f5] transition-colors">Chat</button>
            <button type="button" className="w-full flex justify-between items-center px-2.5 py-2 rounded-lg text-[12.5px] transition-colors" style={{ background: "rgba(208,188,255,.08)", color: "#e9e6f5", boxShadow: "inset 2px 0 0 #d0bcff" }}>Providers</button>
          </nav>
          <div className="ml-3 mt-1 pl-2.5 space-y-0.5" style={{ borderLeft: "1px solid rgba(208,188,255,.08)" }}>
            <a href="#providers" className="block text-[12px] py-1 px-2.5 rounded" style={{ color: "#d0bcff" }}>Provider status</a>
            <a href="#routing" className="block text-[12px] py-1 px-2.5 rounded text-[#6b6889] hover:text-[#a7a2c2]">Routing</a>
            <a href="#models" className="block text-[12px] py-1 px-2.5 rounded text-[#6b6889] hover:text-[#a7a2c2]">Model assignments</a>
            <a href="#keys" className="block text-[12px] py-1 px-2.5 rounded text-[#6b6889] hover:text-[#a7a2c2]">Keys (BYOK)</a>
            <a href="#billing" className="block text-[12px] py-1 px-2.5 rounded text-[#6b6889] hover:text-[#a7a2c2]">Billing</a>
          </div>
        </div>

        {billing?.owner_unlimited && (
          <button type="button" onClick={() => router.push("/admin")} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[#4edea3] text-[12.5px] hover:bg-white/5 transition-colors">
            <AppIcon name="admin" className="h-4 w-4" /> Admin
          </button>
        )}

        <div className="mt-auto space-y-2">
          <button type="button" onClick={() => router.push("/workspace")} className="w-full flex justify-between items-center px-3.5 py-3 rounded-xl font-semibold text-[12.5px]" style={{ background: "#d0bcff", color: "#1a0f3a" }}>
            + New run
          </button>
          <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-2 px-2.5 py-2 text-[12px] text-[#6b6889] hover:text-[#a7a2c2] rounded-lg transition-colors">
            <AppIcon name="logout" className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-14 py-6 lg:py-10 pb-mobile-nav lg:pb-10" style={{ maxWidth: 1080 }}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6889" }}>
          <span><span style={{ color: "#4edea3" }}>●</span> Configuration · {saved ? "saved ✓" : "unsaved"}</span>
          <span>v0.4.x</span>
        </div>

        {/* Hero */}
        <div style={{ padding: "18px 0 36px", maxWidth: 700, borderBottom: "1px solid rgba(208,188,255,.1)", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontSize: "clamp(32px,3.8vw,50px)", lineHeight: 1.02, letterSpacing: "-0.025em", margin: "0 0 14px", color: "#e9e6f5", fontVariationSettings: '"opsz" 144' }}>
            Tune how the mob<br /><em style={{ fontStyle: "italic", color: "#d0bcff" }}>routes, bills, and decides.</em>
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: "#a7a2c2", maxWidth: 540, margin: 0 }}>
            Configure provider access, pick a routing mode, assign models to each mind and to the synthesis judge. Keys stay in your browser until you save.
          </p>
        </div>

        {showcaseMode && (
          <div className="mb-6 px-4 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-100/95 text-sm leading-snug">
            <span className="font-semibold">Showcase mode</span>
            <span className="text-amber-100/80"> — LLM calls are disabled on this deployment.</span>
          </div>
        )}

        {/* ── Provider status board ── */}
        <div id="providers">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontStyle: "italic", fontSize: 22, color: "#e9e6f5", margin: 0, letterSpacing: "-0.01em" }}><em style={{ color: "#d0bcff" }}>Providers</em> · live status</h3>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b6889" }}>
              ● <b style={{ color: "#4edea3" }}>{configuredCount} UP</b> · {KEY_ROWS.length - configuredCount} OFF
            </span>
          </div>
          <div style={{ border: "1px solid rgba(208,188,255,.1)", borderRadius: 14, overflow: "hidden", marginBottom: 36, background: "#0e1830" }}>
            <div className="hidden lg:grid" style={{ gridTemplateColumns: "14px 1fr 220px 100px 80px", gap: 14, padding: "10px 18px", borderBottom: "1px solid rgba(208,188,255,.1)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6889", background: "rgba(0,0,0,.2)" }}>
              <span /><span>Provider · Model</span><span>Key</span><span>Status</span><span />
            </div>
            {KEY_ROWS.map((row, rowIdx) => {
              const keyVal = draft[row.id]?.trim();
              const isSet = Boolean(keyVal);
              const maskedKey = keyVal ? `${keyVal.slice(0, 8)}●●●${keyVal.slice(-4)}` : null;
              const isOpen = openAccordion === row.id;
              return (
                <div key={row.id} style={{ borderBottom: rowIdx < KEY_ROWS.length - 1 ? "1px dashed rgba(208,188,255,.06)" : "none" }}>
                  <div className="flex lg:grid gap-3 items-center flex-wrap" style={{ gridTemplateColumns: "14px 1fr 220px 100px 80px", padding: "14px 18px" }}>
                    <span className="flex-shrink-0" style={{ width: 8, height: 8, borderRadius: "50%", background: isSet ? "#4edea3" : "#6b6889", boxShadow: isSet ? "0 0 8px #4edea3" : "none", display: "block" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: "#162449", display: "grid", placeItems: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: isSet ? "#d0bcff" : "#6b6889", flexShrink: 0 }}>
                        {row.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, color: isSet ? "#e9e6f5" : "#6b6889", letterSpacing: "-0.005em" }}>{row.title}</div>
                        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#6b6889", letterSpacing: "0.04em", marginTop: 2 }}>{row.hint}</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5 }}>
                      {isSet
                        ? <span style={{ background: "rgba(78,222,163,.08)", padding: "3px 7px", borderRadius: 4, color: "#4edea3" }}>{showSecrets ? draft[row.id] : maskedKey}</span>
                        : <span style={{ color: "#6b6889", fontStyle: "italic", fontSize: 11 }}>no key — disabled</span>
                      }
                    </div>
                    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: isSet ? "#4edea3" : "#6b6889", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {isSet ? "● ready" : "○ off"}
                    </div>
                    <div>
                      <button type="button" onClick={() => setOpenAccordion(isOpen ? null : row.id)}
                        style={{ padding: "5px 10px", border: "1px solid rgba(208,188,255,.14)", background: "transparent", borderRadius: 6, color: "#a7a2c2", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                        {isSet ? "Edit" : "Add"}
                      </button>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "0 18px 14px", borderTop: "1px solid rgba(208,188,255,.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 8px" }}>
                        <a href={row.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#d0bcff", fontFamily: "JetBrains Mono, monospace" }}>Get key →</a>
                      </div>
                      <input type={showSecrets ? "text" : "password"} autoComplete="off" value={draft[row.id]}
                        onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                        placeholder={`Paste ${row.title} API key`}
                        className="w-full min-h-10 bg-[#060e20] rounded-lg px-3 py-2 text-[#dae2fd] text-sm border border-[rgba(208,188,255,0.12)] outline-none focus:ring-1 focus:ring-[#d0bcff]/40 font-mono"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", background: "rgba(0,0,0,.2)", borderTop: "1px solid rgba(208,188,255,.1)", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b6889", alignItems: "center" }}>
              <div>Keys filled · <b style={{ color: "#e9e6f5" }}>{configuredCount}/{KEY_ROWS.length}</b></div>
              <button type="button" onClick={() => setShowSecrets(!showSecrets)} style={{ padding: "5px 10px", border: "1px dashed rgba(208,188,255,.18)", background: "transparent", color: "#a7a2c2", borderRadius: 6, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                {showSecrets ? "Hide" : "Show"} secrets
              </button>
            </div>
          </div>
        </div>

        {/* ── Routing + Billing ── */}
        <div id="routing" className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-9">
          <div style={{ border: "1px solid rgba(208,188,255,.1)", borderRadius: 14, padding: 20, background: "rgba(255,255,255,.01)" }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6889", marginBottom: 4 }}>§ Routing <em style={{ color: "#4edea3", fontStyle: "normal" }}>· how requests leave your browser</em></div>
            <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, color: "#e9e6f5", margin: "0 0 14px", letterSpacing: "-0.01em", lineHeight: 1.35 }}>Send all providers through <em style={{ fontStyle: "italic", color: "#d0bcff" }}>one router</em>, or call each directly.</p>
            {process.env.NODE_ENV === "development" && (
              <label style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start", padding: 13, border: `1px dashed ${useOpenRouterDev ? "#d0bcff" : "rgba(208,188,255,.1)"}`, borderRadius: 10, cursor: "pointer", background: useOpenRouterDev ? "rgba(208,188,255,.04)" : "transparent" }}>
                <div style={{ width: 34, height: 19, borderRadius: 999, background: useOpenRouterDev ? "#d0bcff" : "rgba(208,188,255,.12)", position: "relative", flexShrink: 0, marginTop: 2, cursor: "pointer" }} onClick={() => setUseOpenRouterDev(!useOpenRouterDev)}>
                  <div style={{ position: "absolute", top: 2, width: 15, height: 15, borderRadius: "50%", background: "#1a0f3a", transition: "left .2s", left: useOpenRouterDev ? 17 : 2 }} />
                </div>
                <div style={{ fontSize: 13, color: "#a7a2c2", lineHeight: 1.5 }}>
                  <b style={{ color: "#e9e6f5", display: "block", fontWeight: 500, fontSize: 13, marginBottom: 3 }}>Use OpenRouter as proxy</b>
                  All models route through OpenRouter using <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#4edea3", background: "rgba(78,222,163,.06)", padding: "1px 5px", borderRadius: 3 }}>OPENROUTER_API_KEY</code>.
                </div>
              </label>
            )}
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.04em", color: "#6b6889", marginTop: 10, paddingTop: 10, borderTop: "1px dashed rgba(208,188,255,.08)" }}>
              Keys stay in this browser · never logged server-side
            </div>
          </div>

          {!showcaseMode && (
            <div id="billing" style={{ border: "1px solid rgba(208,188,255,.1)", borderRadius: 14, padding: 20, background: "rgba(255,255,255,.01)" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6889", marginBottom: 4 }}>§ Billing <em style={{ color: "#d0bcff", fontStyle: "normal" }}>· {billing ? (billing.owner_unlimited ? "owner" : billing.tier) : "loading"}</em></div>
              <p style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, color: "#e9e6f5", margin: "0 0 12px", letterSpacing: "-0.01em", lineHeight: 1.35 }}>Top up when you run dry. <em style={{ fontStyle: "italic", color: "#d0bcff" }}>No subscription</em> — credits don&apos;t expire.</p>
              {billing && !billing.owner_unlimited && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 4px" }}>
                    <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 30, fontWeight: 300, color: "#e9e6f5", letterSpacing: "-0.02em", fontVariationSettings: '"opsz" 144' }}>
                      $<em style={{ color: "#4edea3", fontStyle: "italic" }}>{((billing.available_credit_cents ?? billing.credit_balance_cents) / 100).toFixed(2)}</em>
                    </span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6b6889" }}>remaining</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                    {[500, 1000, 2000].map((amount) => (
                      <button key={amount} type="button" onClick={() => void handleTopUp(amount)} disabled={topupLoading !== null}
                        style={{ padding: "9px 13px", border: "1px solid rgba(208,188,255,.2)", background: amount === 2000 ? "#d0bcff" : "transparent", color: amount === 2000 ? "#1a0f3a" : "#e9e6f5", borderRadius: 8, fontFamily: "Manrope, sans-serif", fontSize: 12.5, cursor: "pointer", opacity: topupLoading !== null ? 0.6 : 1 }}>
                        {topupLoading === amount ? "Redirecting…" : `+ $${(amount / 100).toFixed(0)}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {billing?.owner_unlimited && <p style={{ fontSize: 13, color: "#4edea3" }}>Owner bypass active — no limits or charges.</p>}
              {!billing && <p style={{ fontSize: 13, color: "#6b6889" }}>Loading billing info…</p>}
              {billing?.recent_events && billing.recent_events.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#6b6889", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recent usage</div>
                  <table className="w-full text-left text-xs" style={{ fontFamily: "JetBrains Mono, monospace", color: "#a7a2c2" }}>
                    <tbody>
                      {billing.recent_events.slice(0, 5).map((ev) => (
                        <tr key={ev.id} style={{ borderBottom: "1px dashed rgba(208,188,255,.06)" }}>
                          <td className="py-1.5 pr-2 truncate max-w-[120px]" title={ev.model}>{ev.model.split("/").pop()}</td>
                          <td className="py-1.5 pr-2">{ev.prompt_tokens}+{ev.completion_tokens}t</td>
                          <td className="py-1.5" style={{ color: "#4edea3" }}>${(ev.cost_cents / 100).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Model assignments ── */}
        <div id="models">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontStyle: "italic", fontSize: 22, color: "#e9e6f5", margin: 0, letterSpacing: "-0.01em" }}><em style={{ color: "#d0bcff" }}>Model assignments</em> · who plays which role</h3>
          </div>
          <div style={{ border: "1px solid rgba(208,188,255,.1)", borderRadius: 14, marginBottom: 36, overflow: "hidden", background: "#0e1830" }}>
            <div className="hidden lg:grid" style={{ gridTemplateColumns: "56px 1fr 1fr 90px", gap: 14, padding: "10px 18px", borderBottom: "1px solid rgba(208,188,255,.1)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6b6889", background: "rgba(0,0,0,.2)" }}>
              <span>Slot</span><span>Role · Model</span><span>Fallback</span><span>Status</span>
            </div>
            {MODEL_SLOTS.map(({ key, label }, i) => {
              const slotColor = key === "bot1" ? "#4edea3" : key === "bot2" ? "#ff8a6b" : key === "bot3" ? "#d0bcff" : "#d0bcff";
              const roleDesc = key === "bot1" ? "speed" : key === "bot2" ? "nuance" : key === "bot3" ? "reach" : "synthesis";
              const isJudge = key === "synth";
              return (
                <div key={key} className="flex lg:grid gap-3 items-center flex-wrap" style={{ gridTemplateColumns: "56px 1fr 1fr 90px", padding: "14px 18px", borderBottom: i < MODEL_SLOTS.length - 1 ? "1px dashed rgba(208,188,255,.06)" : "none", alignItems: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: isJudge ? "#d0bcff" : "#e9e6f5", letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 7px", background: isJudge ? "rgba(208,188,255,.1)" : "rgba(255,255,255,.03)", borderRadius: 6, width: "fit-content" }}>
                    {isJudge ? "Σ" : `0${i + 1}`}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#a7a2c2", marginBottom: 5, letterSpacing: "-0.005em" }}>
                      {label} · <em style={{ color: slotColor, fontStyle: "normal" }}>{roleDesc}</em>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: "1px solid rgba(208,188,255,.1)", borderRadius: 8, background: "rgba(11,19,38,.5)" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: slotColor, boxShadow: `0 0 5px ${slotColor}`, flexShrink: 0 }} />
                      <select value={models[key]} onChange={(e) => setModel(key, e.target.value)}
                        className="bg-transparent border-none outline-none text-[12.5px] w-full" style={{ fontFamily: "JetBrains Mono, monospace", color: "#e9e6f5" }}>
                        {modelGroups.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.models.map((m) => (<option key={m.value} value={m.value} disabled={m.disabled}>{m.displayLabel}</option>))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="hidden lg:block" style={{ color: "#6b6889", fontSize: 12, fontStyle: "italic", fontFamily: "'Fraunces', Georgia, serif" }}>—</div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: isJudge ? "#d0bcff" : "#4edea3" }}>
                    {isJudge ? "● active judge" : "● ready"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Keys / BYOK ── */}
        <div id="keys">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontStyle: "italic", fontSize: 22, color: "#e9e6f5", margin: 0, letterSpacing: "-0.01em" }}><em style={{ color: "#d0bcff" }}>Keys</em> · BYOK receipts</h3>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b6889" }}>{configuredCount}/{KEY_ROWS.length} PROVIDERS</span>
          </div>
          <div style={{ border: "1px solid rgba(208,188,255,.1)", borderRadius: 14, background: "#0e1830", overflow: "hidden", marginBottom: 28 }}>
            <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(208,188,255,.1)", background: "rgba(0,0,0,.2)", display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6b6889" }}>
              <span><b style={{ color: "#e9e6f5" }}>browser-stored</b> · cleared on sign-out</span>
              <button type="button" onClick={() => setShowSecrets(!showSecrets)} style={{ padding: "4px 9px", border: "1px solid rgba(208,188,255,.14)", background: "transparent", color: "#a7a2c2", borderRadius: 6, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                {showSecrets ? "Hide" : "Show"} secrets
              </button>
            </div>
            {KEY_ROWS.map((row, i) => {
              const keyVal = draft[row.id]?.trim();
              const isSet = Boolean(keyVal);
              return (
                <div key={row.id} className="flex lg:grid gap-3 items-center flex-wrap" style={{ gridTemplateColumns: "1fr 1fr auto", padding: "12px 18px", borderBottom: i < KEY_ROWS.length - 1 ? "1px dashed rgba(208,188,255,.06)" : "none", alignItems: "center" }}>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#e9e6f5", letterSpacing: "0.04em" }}>{row.id.toUpperCase()}_API_KEY</div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}>
                    {isSet
                      ? <span style={{ color: "#4edea3", background: "rgba(78,222,163,.05)", padding: "4px 8px", borderRadius: 5 }}>{showSecrets ? draft[row.id] : `${keyVal.slice(0, 8)}●●●${keyVal.slice(-4)}`}</span>
                      : <span style={{ color: "#6b6889", fontStyle: "italic", fontSize: 10 }}>not set — add to enable</span>
                    }
                  </div>
                  <input type={showSecrets ? "text" : "password"} autoComplete="off" value={draft[row.id]}
                    onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                    placeholder={isSet ? "Replace…" : `Paste ${row.title} key`}
                    className="min-h-9 bg-[#060e20] rounded-lg px-3 py-1.5 text-[#dae2fd] text-xs border border-[rgba(208,188,255,0.1)] outline-none focus:ring-1 focus:ring-[#d0bcff]/40 font-mono"
                    style={{ minWidth: 140 }}
                  />
                </div>
              );
            })}
            <div style={{ padding: "10px 18px", background: "rgba(0,0,0,.2)", borderTop: "1px solid rgba(208,188,255,.1)", display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6b6889" }}>
              <span><b style={{ color: "#e9e6f5" }}>{configuredCount}/{KEY_ROWS.length}</b> keys filled</span>
              <span>keys stay in this browser · never logged server-side</span>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ padding: "18px 20px", border: "1px dashed rgba(208,188,255,.12)", borderRadius: 12, display: "grid", gridTemplateColumns: "24px 1fr", gap: 14, marginBottom: 36 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#d0bcff", width: 24, height: 24, border: "1px solid #d0bcff", borderRadius: 6, display: "grid", placeItems: "center" }}>§</div>
          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14.5, lineHeight: 1.5, color: "#a7a2c2", letterSpacing: "-0.005em" }}>
            <b style={{ color: "#e9e6f5", fontWeight: 500, fontStyle: "normal" }}>The privacy contract.</b> Keys stay in this browser until you save. They&apos;re sent to this app <em style={{ color: "#d0bcff", fontStyle: "italic" }}>only when you send a chat message</em>, to be forwarded to the provider.
          </div>
        </div>

        {/* Save / Discard */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-6">
          <button type="button" onClick={handleDiscard} className="min-h-11 px-6 rounded-xl text-sm font-medium text-[#a7a2c2] border border-[rgba(208,188,255,0.12)] hover:bg-[#222a3d] transition-colors">Discard</button>
          <button type="button" onClick={handleSave} className="min-h-11 px-8 rounded-xl text-sm font-bold shadow-lg" style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", color: "#340080", boxShadow: "0 4px 16px rgba(208,188,255,0.3)" }}>
            {saved ? "Saved ✓" : "Save keys & models"}
          </button>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t border-white/8 bg-[#10182b]/95 backdrop-blur-xl z-50 safe-bottom pt-1">
        <button type="button" onClick={() => router.push("/workspace")} className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]">
          <AppIcon name="chat" className="h-6 w-6" /><span className="text-[10px]">Chat</span>
        </button>
        <button type="button" className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#d0bcff]">
          <AppIcon name="key" className="h-6 w-6" /><span className="text-[10px]">Keys</span>
        </button>
        <button type="button" onClick={handleSignOut} className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]">
          <AppIcon name="logout" className="h-6 w-6" /><span className="text-[10px]">Out</span>
        </button>
      </div>

      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-[#d0bcff]/[0.04]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full blur-[100px] bg-[#4edea3]/[0.04]" />
      </div>
    </div>
  );
}
