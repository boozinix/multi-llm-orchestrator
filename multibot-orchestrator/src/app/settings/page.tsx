"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/store/settings-store";
import { GROUPED_MODELS } from "@/lib/constants";
import type { ModelConfig } from "@/lib/types";

const MODEL_SLOTS: { key: keyof ModelConfig; label: string }[] = [
  { key: "bot1", label: "Bot 1" },
  { key: "bot2", label: "Bot 2" },
  { key: "bot3", label: "Bot 3" },
  { key: "synth", label: "Synthesis Model" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { openRouterKey, models, setOpenRouterKey, setModel } = useSettingsStore();
  const [keyInput, setKeyInput] = useState(openRouterKey);
  const [keyVisible, setKeyVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState({ runs: 0, apiCalls: 0, runLimit: 10, apiCallLimit: 30 });

  useEffect(() => {
    setKeyInput(openRouterKey);
  }, [openRouterKey]);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        if (d.runs !== undefined) setUsage(d);
      })
      .catch(() => {});
  }, []);

  function handleSave() {
    setOpenRouterKey(keyInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const runPct = Math.min(100, (usage.runs / usage.runLimit) * 100);
  const apiPct = Math.min(100, (usage.apiCalls / usage.apiCallLimit) * 100);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1326]">
      {/* Sidebar */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-[#131b2e] flex flex-col p-4 z-50 hidden lg:flex">
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
            onClick={() => router.push("/workspace")}
            className="w-full text-[#94a3b8] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left hover:bg-[#222a3d] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            Chat
          </button>
          <button
            onClick={() => router.push("/workspace")}
            className="w-full text-[#94a3b8] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left hover:bg-[#222a3d] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">history</span>
            History
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="w-full bg-[#222a3d] text-[#d0bcff] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left transition-colors"
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
              <div
                className="h-full rounded-full"
                style={{ width: `${runPct}%`, background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)" }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#94a3b8] hover:text-[#dae2fd] hover:bg-[#222a3d] rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Top bar */}
      <div className="lg:ml-64 flex-1 flex flex-col overflow-hidden">
        <header className="fixed top-0 right-0 left-0 lg:left-64 flex justify-between items-center px-4 lg:px-8 h-14 lg:h-16 bg-[#0b1326]/80 backdrop-blur-xl z-40 shadow-2xl border-b border-[#494454]/10">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-[#dae2fd]">Orchestrator</h2>
            <div className="h-4 w-[1px] bg-[#494454]/30 hidden lg:block" />
            <span className="hidden lg:block text-sm text-[#cbc3d7]/70" style={{ fontFamily: "JetBrains Mono, monospace" }}>/system/api-config</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/workspace")}
              className="px-4 py-1.5 text-sm font-semibold text-[#d0bcff] border border-[#d0bcff]/20 rounded-full hover:bg-[#d0bcff]/5 transition-all"
            >
              New Chat
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="mt-14 lg:mt-16 overflow-y-auto flex-1 px-4 lg:px-8 py-8 lg:py-10">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h1 className="text-2xl lg:text-4xl font-extrabold tracking-tight text-[#dae2fd] mb-2">
                  System Configuration
                </h1>
                <p className="text-[#cbc3d7] max-w-xl text-sm">
                  Configure your OpenRouter key and model assignments.
                </p>
              </div>
              <div className="px-4 py-2 bg-[#131b2e] rounded-xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
                <span className="text-sm text-[#4edea3]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Global Sync: Active</span>
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* Usage card */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-[#131b2e] rounded-3xl p-6 flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-[#dae2fd]">Daily Usage</h3>
                      <p className="text-xs text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Resets at midnight</p>
                    </div>
                    <span className="material-symbols-outlined text-[#d0bcff]">data_thresholding</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#cbc3d7]">Runs</span>
                        <span className="text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usage.runs}/{usage.runLimit}</span>
                      </div>
                      <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${runPct}%`, background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", boxShadow: "0 0 8px rgba(160,120,255,0.4)" }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-[#cbc3d7]">API Calls</span>
                        <span className="text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usage.apiCalls}/{usage.apiCallLimit}</span>
                      </div>
                      <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${apiPct}%`, background: "linear-gradient(135deg, #4edea3 0%, #00a572 100%)", boxShadow: "0 0 8px rgba(78,222,163,0.3)" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm pt-2 border-t border-[#494454]/10">
                    <span className="text-[#cbc3d7]">Remaining Runs</span>
                    <span className="text-[#4edea3]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{Math.max(0, usage.runLimit - usage.runs)}</span>
                  </div>
                </div>

                <div className="bg-[#131b2e]/60 border border-[#d0bcff]/5 rounded-3xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-[#4edea3]">memory</span>
                    <span className="text-xs uppercase tracking-widest text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Core Engine</span>
                  </div>
                  <div className="space-y-2 text-xs" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    <div className="flex justify-between">
                      <span className="text-[#cbc3d7]/60">ENDPOINT</span>
                      <span className="text-[#dae2fd]">openrouter.ai</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#cbc3d7]/60">VERSION</span>
                      <span className="text-[#dae2fd]">v2.0.0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Config area */}
              <div className="lg:col-span-2 space-y-4">
                {/* OpenRouter key */}
                <div className="bg-[#131b2e] rounded-3xl p-6 hover:bg-[#171f33] transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#2d3449] flex items-center justify-center border border-[#494454]/20">
                        <span className="material-symbols-outlined text-[#d0bcff] text-xl">hub</span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-[#dae2fd]">OpenRouter</h4>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${openRouterKey ? "bg-[#4edea3]" : "bg-[#ffb4ab]"}`} />
                          <span className={`text-xs font-medium ${openRouterKey ? "text-[#4edea3]" : "text-[#ffb4ab]"}`}>
                            {openRouterKey ? "Key Configured" : "Key Required"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#d0bcff] border border-[#d0bcff]/20 px-3 py-1 rounded-full hover:bg-[#d0bcff]/10 transition-colors"
                      style={{ fontFamily: "JetBrains Mono, monospace" }}
                    >
                      Get Key →
                    </a>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase tracking-wider text-[#cbc3d7] px-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                      API Authentication Key
                    </label>
                    <div className="relative">
                      <input
                        type={keyVisible ? "text" : "password"}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="sk-or-v1-..."
                        className="w-full bg-[#060e20] rounded-xl px-4 py-3 pr-24 text-[#dae2fd] text-sm border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40 transition-all placeholder:text-[#cbc3d7]/30"
                        style={{ fontFamily: "JetBrains Mono, monospace" }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setKeyVisible(!keyVisible)}
                          className="p-1.5 text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">{keyVisible ? "visibility_off" : "visibility"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (keyInput) navigator.clipboard.writeText(keyInput); }}
                          className="p-1.5 text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">content_copy</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#cbc3d7]/50 px-1">
                      Your key is stored locally in your browser. It is never sent to our servers.
                    </p>
                  </div>
                </div>

                {/* Model assignments */}
                <div className="bg-[#131b2e] rounded-3xl p-6 hover:bg-[#171f33] transition-all">
                  <h4 className="text-lg font-bold text-[#dae2fd] mb-1">Model Assignments</h4>
                  <p className="text-sm text-[#cbc3d7] mb-6">Assign models to each bot slot and synthesis role.</p>
                  <div className="space-y-4">
                    {MODEL_SLOTS.map(({ key, label }) => (
                      <div key={key}>
                        <label className="block text-[10px] uppercase tracking-wider text-[#cbc3d7] mb-2 px-1" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                          {label}
                        </label>
                        <select
                          value={models[key]}
                          onChange={(e) => setModel(key, e.target.value)}
                          className="w-full bg-[#060e20] text-[#dae2fd] rounded-xl px-4 py-3 text-sm border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40 transition-all"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}
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
              </div>
            </div>

            {/* Save bar */}
            <div className="flex justify-center">
              <div className="glass-panel px-6 py-4 rounded-full border border-[#494454]/20 flex items-center gap-6 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#4edea3]" />
                  <span className="text-sm font-semibold text-[#dae2fd] tracking-tight">Configuration Ready</span>
                </div>
                <div className="h-6 w-[1px] bg-[#494454]/20" />
                <div className="flex gap-3">
                  <button
                    onClick={() => setKeyInput(openRouterKey)}
                    className="text-sm font-medium text-[#cbc3d7] hover:text-[#d0bcff] transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 text-sm font-bold rounded-full shadow-lg active:scale-95 transition-all"
                    style={{
                      background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                      color: "#340080",
                      boxShadow: "0 4px 16px rgba(208,188,255,0.3)",
                    }}
                  >
                    {saved ? "Saved!" : "Save Configuration"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ background: "rgba(208,188,255,0.04)" }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full blur-[100px]" style={{ background: "rgba(78,222,163,0.04)" }} />
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t border-[#494454]/10 bg-[#131b2e] z-50">
        <button onClick={() => router.push("/workspace")} className="flex-1 flex flex-col items-center py-2 text-[#94a3b8]">
          <span className="material-symbols-outlined text-xl">chat</span>
          <span className="text-[10px] mt-0.5">Chat</span>
        </button>
        <button className="flex-1 flex flex-col items-center py-2 text-[#d0bcff]">
          <span className="material-symbols-outlined text-xl">settings</span>
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>
        <button onClick={handleSignOut} className="flex-1 flex flex-col items-center py-2 text-[#94a3b8]">
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="text-[10px] mt-0.5">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
