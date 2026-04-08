"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore, type ProviderKeyId } from "@/store/settings-store";
import { GROUPED_MODELS } from "@/lib/constants";
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
  const { providerKeys, setProviderKeys, models, setModel } = useSettingsStore();
  const [draft, setDraft] = useState<UserProviderKeys>(providerKeys);
  const [showSecrets, setShowSecrets] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState({ runs: 0, apiCalls: 0, runLimit: 10, apiCallLimit: 30 });
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<ProviderKeyId | null>(null);

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
        if (d.runs !== undefined) setUsage(d);
      })
      .catch(() => {});
  }, []);

  const handleSave = useCallback(() => {
    setProviderKeys(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [draft, setProviderKeys]);

  const handleDiscard = useCallback(() => {
    setDraft(providerKeys);
  }, [providerKeys]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const runPct = Math.min(100, (usage.runs / usage.runLimit) * 100);
  const apiPct = Math.min(100, (usage.apiCalls / usage.apiCallLimit) * 100);

  const configuredCount = KEY_ROWS.filter((r) => draft[r.id]?.trim()).length;

  return (
    <div className="flex min-h-[100dvh] lg:h-screen overflow-hidden bg-[#0b1326]">
      <aside className="h-screen w-64 fixed left-0 top-0 bg-[#131b2e] flex-col p-4 z-50 hidden lg:flex">
        <div className="mb-8 px-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#a078ff] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#340080] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#dae2fd] tracking-tighter">Multibot Pro</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#d0bcff] opacity-80" style={{ fontFamily: "JetBrains Mono, monospace" }}>Orchestrator</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <button
            type="button"
            onClick={() => router.push("/workspace")}
            className="w-full min-h-11 text-[#94a3b8] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left hover:bg-[#222a3d] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            Chat
          </button>
          <button
            type="button"
            onClick={() => router.push("/settings")}
            className="w-full min-h-11 bg-[#222a3d] text-[#d0bcff] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>settings</span>
            Settings
          </button>
        </nav>
        <div className="mt-auto space-y-4">
          <div className="bg-[#171f33] p-3 rounded-xl border border-[#494454]/10">
            <div className="flex justify-between mb-2">
              <span className="text-[11px] text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Usage</span>
              <span className="text-[11px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usage.runs}/{usage.runLimit}</span>
            </div>
            <div className="h-1.5 w-full bg-[#2d3449] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${runPct}%`, background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)" }} />
            </div>
          </div>
          <button type="button" onClick={handleSignOut} className="w-full min-h-11 flex items-center gap-3 px-3 py-2 text-sm text-[#94a3b8] hover:text-[#dae2fd] hover:bg-[#222a3d] rounded-lg transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:ml-64 flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <header className="sticky top-0 z-40 flex justify-between items-center gap-2 px-4 sm:px-6 min-h-14 py-3 lg:px-8 lg:h-16 lg:min-h-0 bg-[#0b1326]/95 backdrop-blur-xl border-b border-[#494454]/10 safe-top">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h2 className="font-semibold text-[#dae2fd] text-sm sm:text-base truncate">API keys</h2>
            <span className="hidden sm:inline text-xs text-[#cbc3d7]/60 font-mono truncate">models you use need a key</span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/workspace")}
            className="shrink-0 min-h-10 px-3 sm:px-4 py-2 text-sm font-semibold text-[#d0bcff] border border-[#d0bcff]/20 rounded-xl hover:bg-[#d0bcff]/5 transition-all"
          >
            Chat
          </button>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 sm:py-6 lg:px-8 lg:py-8 pb-mobile-nav">
          <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
            {showcaseMode && (
              <div className="px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100/95 text-sm leading-snug">
                <span className="font-semibold">Showcase mode</span>
                <span className="text-amber-100/80"> — LLM calls are disabled on this deployment.</span>
              </div>
            )}

            <p className="text-sm text-[#cbc3d7] leading-relaxed">
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
                  <div key={row.id} className="rounded-2xl border border-[#494454]/20 bg-[#131b2e] overflow-hidden">
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
                        <span className="material-symbols-outlined text-[#cbc3d7]">{open ? "expand_less" : "expand_more"}</span>
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
                <div key={row.id} className="bg-[#131b2e] rounded-2xl p-5 border border-[#494454]/15">
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

            <div className="bg-[#131b2e] rounded-2xl p-4 sm:p-6 border border-[#494454]/15">
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
                      {GROUPED_MODELS.map((g) => (
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
              <div className="bg-[#131b2e] rounded-3xl p-6">
                <h3 className="font-semibold text-[#dae2fd] mb-4">Daily usage</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#cbc3d7]">Runs</span>
                      <span className="text-[#d0bcff] font-mono">{usage.runs}/{usage.runLimit}</span>
                    </div>
                    <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${runPct}%`, background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#cbc3d7]">API calls</span>
                      <span className="text-[#d0bcff] font-mono">{usage.apiCalls}/{usage.apiCallLimit}</span>
                    </div>
                    <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${apiPct}%`, background: "linear-gradient(135deg, #4edea3 0%, #00a572 100%)" }} />
                    </div>
                  </div>
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

      <div className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t border-[#494454]/10 bg-[#131b2e] z-50 safe-bottom pt-1">
        <button type="button" onClick={() => router.push("/workspace")} className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]">
          <span className="material-symbols-outlined text-2xl">chat</span>
          <span className="text-[10px]">Chat</span>
        </button>
        <button type="button" className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#d0bcff]">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>key</span>
          <span className="text-[10px]">Keys</span>
        </button>
        <button type="button" onClick={handleSignOut} className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]">
          <span className="material-symbols-outlined text-2xl">logout</span>
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
