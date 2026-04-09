"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useChatStore } from "@/store/chat-store";
import { useSettingsStore } from "@/store/settings-store";
import {
  GROUPED_MODELS,
  modelLabel,
  filterGroupedModels,
  clampModelConfigToAllowed,
} from "@/lib/constants";
import { FlowDiagram } from "./FlowDiagram";
import type { ConversationRecord, ChatMessage, BotRunOutput, FlowConfig } from "@/lib/types";

const BOT_SLOTS = ["bot1", "bot2", "bot3"] as const;

type UsageViewState = {
  mode?: string;
  runs: number;
  apiCalls: number;
  runLimit: number;
  apiCallLimit: number;
  credit_balance_cents?: number;
  free_runs_remaining?: number;
};

function usagePrimarySecondary(u: UsageViewState): { primary: string; secondary: string | null } {
  const mode = u.mode ?? "daily";
  if (mode === "free_lifetime") {
    return {
      primary: `${u.runs}/${u.runLimit} free run${u.runLimit === 1 ? "" : "s"}`,
      secondary: u.free_runs_remaining === 0 ? "Upgrade for more runs" : "Low-cost models only",
    };
  }
  if (mode === "paid_credits") {
    const usd = ((u.credit_balance_cents ?? 0) / 100).toFixed(2);
    return { primary: `$${usd} credits`, secondary: null };
  }
  if (mode === "owner_unlimited") {
    return { primary: "Unlimited", secondary: null };
  }
  return {
    primary: `${u.runs}/${u.runLimit} runs`,
    secondary: `${u.apiCalls}/${u.apiCallLimit} API calls`,
  };
}

function usageBarPercent(u: UsageViewState): number {
  if (u.mode === "owner_unlimited") return 100;
  if (u.runLimit > 0) return Math.min(100, (u.runs / u.runLimit) * 100);
  return 0;
}

type StreamBlock = {
  phase: string;
  label: string;
  text: string;
};

function phaseAccentClass(phase: string): string {
  if (phase === "bot1") return "border-[#8b5cf6]/40 bg-[#8b5cf6]/10";
  if (phase === "bot2") return "border-[#06b6d4]/40 bg-[#06b6d4]/10";
  if (phase === "bot3") return "border-[#22c55e]/40 bg-[#22c55e]/10";
  if (phase.startsWith("merge")) return "border-[#f59e0b]/40 bg-[#f59e0b]/10";
  return "border-[#494454]/20 bg-[#131b2e]";
}

function CopyTextButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* ignore clipboard errors */
        }
      }}
      className="text-[10px] font-mono px-2 py-1 rounded-md border border-[#494454]/25 text-[#cbc3d7] hover:text-[#d0bcff] hover:border-[#d0bcff]/35 transition-colors"
      title={label}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function SideNav({
  conversations,
  activeId,
  usage,
  onSelect,
  onNew,
  onNav,
  onSignOut,
}: {
  conversations: ConversationRecord[];
  activeId: string | null;
  usage: UsageViewState;
  onSelect: (id: string) => void;
  onNew: () => void;
  onNav: (page: "workspace" | "settings") => void;
  onSignOut: () => void;
}) {
  const { primary: usagePrimary, secondary: usageSecondary } = usagePrimarySecondary(usage);
  const runPct = usageBarPercent(usage);

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#131b2e] flex flex-col p-4 z-50 overflow-hidden">
      <div className="mb-6 px-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#a078ff] flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#340080] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#dae2fd] tracking-tighter">Multibot Pro</h1>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#d0bcff] opacity-80" style={{ fontFamily: "JetBrains Mono, monospace" }}>Orchestrator</p>
        </div>
      </div>

      <nav className="space-y-1 mb-4">
        <button
          onClick={() => onNav("workspace")}
          className="w-full bg-[#222a3d] text-[#d0bcff] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">chat</span>
          Chat
        </button>
        <button
          onClick={() => onNav("settings")}
          className="w-full text-[#94a3b8] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left hover:bg-[#222a3d] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">key</span>
          API Keys
        </button>
        <button
          onClick={() => onNav("settings")}
          className="w-full text-[#94a3b8] rounded-lg flex items-center gap-3 px-3 py-2.5 font-medium text-sm text-left hover:bg-[#222a3d] transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          Settings
        </button>
      </nav>

      {/* History */}
      <div className="flex-1 overflow-y-auto space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-[#cbc3d7]/50 px-3 mb-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>History</p>
        {conversations.length === 0 && (
          <p className="text-xs text-[#94a3b8] px-3">No conversations yet</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors truncate ${
              activeId === c.id ? "bg-[#222a3d] text-[#dae2fd]" : "text-[#94a3b8] hover:bg-[#222a3d] hover:text-[#dae2fd]"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Usage bar */}
      <div className="mt-4 space-y-3">
        <div className="bg-[#171f33] p-3 rounded-xl border border-[#494454]/10">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Usage Limit</span>
            <span className="text-[11px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usagePrimary}</span>
          </div>
          <div className="h-1.5 w-full bg-[#2d3449] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${runPct}%`, background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", boxShadow: "0 0 12px 2px rgba(160,120,255,0.3)" }}
            />
          </div>
          {usageSecondary && (
            <p className="text-[10px] text-[#cbc3d7]/50 mt-1">{usageSecondary}</p>
          )}
        </div>

        <div className="space-y-1">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#94a3b8] hover:bg-[#222a3d] hover:text-[#dae2fd] transition-colors rounded-lg"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Chat
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#94a3b8] hover:bg-[#222a3d] hover:text-[#dae2fd] transition-colors rounded-lg"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex gap-3 sm:gap-4 max-w-3xl mx-auto px-0.5">
        <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg bg-[#222a3d] flex-shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#cbc3d7] text-lg sm:text-base">person</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex justify-end">
            <CopyTextButton text={msg.content} label="Copy prompt" />
          </div>
          <p className="text-[#dae2fd] leading-relaxed text-base sm:text-[15px]">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 sm:gap-4 max-w-3xl mx-auto px-0.5">
      <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg flex-shrink-0 flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", boxShadow: "0 4px 12px rgba(208,188,255,0.2)" }}>
        <span className="material-symbols-outlined text-[#340080] text-lg sm:text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      </div>
      <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#d0bcff] font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Orchestrator
          </span>
          {msg.botOutputs && msg.botOutputs.length > 1 && (
            <span className="text-[10px] text-[#cbc3d7] opacity-60" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              (Synthesis of {msg.botOutputs.length} models)
            </span>
          )}
        </div>
        <div className="bg-[#131b2e] p-4 sm:p-6 rounded-2xl space-y-3 sm:space-y-4 border border-[#494454]/10">
          {msg.botOutputs && msg.botOutputs.length > 1 && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-[#cbc3d7]/70 font-mono">Bot Answers</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {msg.botOutputs.map((bot) => (
                  <BotOutputCard key={bot.slotId} bot={bot} />
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[#494454]/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-widest text-[#d0bcff] font-mono">Final Answer</p>
              <CopyTextButton text={msg.content} label="Copy final" />
            </div>
            <p className="text-[#dae2fd] leading-relaxed whitespace-pre-wrap text-[15px] sm:text-base">{msg.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotOutputCard({ bot }: { bot: BotRunOutput }) {
  const [expanded, setExpanded] = useState(false);
  const label = modelLabel(bot.model);
  const slot = bot.slotId;
  const slotAccent =
    slot === "bot1"
      ? "border-[#8b5cf6]/35 bg-[#8b5cf6]/10"
      : slot === "bot2"
        ? "border-[#06b6d4]/35 bg-[#06b6d4]/10"
        : "border-[#22c55e]/35 bg-[#22c55e]/10";

  return (
    <div className={`p-3 rounded-xl border ${slotAccent}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
          <span className="text-[10px] text-[#cbc3d7] uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            {slot.toUpperCase()} · {label}
          </span>
        </div>
        <CopyTextButton text={bot.output} label="Copy" />
      </div>
      <p className={`text-xs text-[#dae2fd]/70 ${expanded ? "" : "line-clamp-3"}`}>{bot.output}</p>
      {bot.output.length > 200 && (
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-[#d0bcff] mt-1">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function FlowPanel({
  flow,
  onFlowChange,
  groupedModels,
}: {
  flow: FlowConfig;
  onFlowChange: (p: Partial<FlowConfig>) => void;
  groupedModels: typeof GROUPED_MODELS;
}) {
  const { models, setModel } = useSettingsStore();

  return (
    <section className="w-full lg:w-80 lg:min-w-[20rem] bg-[#131b2e] overflow-y-auto p-4 sm:p-5 flex flex-col gap-5 lg:gap-6 min-h-0">

      {/* Live flow diagram */}
      <div>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#cbc3d7] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          Execution Flow
        </h3>
        <div className="bg-[#0d1525] rounded-2xl p-3 border border-[#494454]/15">
          <FlowDiagram flow={flow} models={models} />
        </div>
      </div>

      <div>
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#cbc3d7] mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>Mode</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onFlowChange({ mode: "quick" })}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              flow.mode === "quick"
                ? "bg-[#d0bcff] text-[#340080]"
                : "bg-[#222a3d] text-[#94a3b8] hover:text-[#dae2fd]"
            }`}
          >
            Quick
          </button>
          <button
            onClick={() => onFlowChange({ mode: "super" })}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              flow.mode === "super"
                ? "text-[#340080]"
                : "bg-[#222a3d] text-[#94a3b8] hover:text-[#dae2fd]"
            }`}
            style={flow.mode === "super" ? { background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)" } : {}}
          >
            Super
          </button>
        </div>
      </div>

      {flow.mode === "quick" && (
        <div className="space-y-3">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Primary Model</h3>
          <select
            value={models[flow.primarySlot]}
            onChange={(e) => setModel(flow.primarySlot, e.target.value)}
            className="w-full bg-[#060e20] text-[#dae2fd] rounded-lg px-3 py-2 text-sm border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {groupedModels.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.models.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-[10px] text-[#cbc3d7]/50">Uses Bot 1 slot. Switch to Super for multi-model.</p>
        </div>
      )}

      {flow.mode === "super" && (
        <div className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Orchestration Flow</h3>

          {BOT_SLOTS.map((slot, i) => (
            <div key={slot} className={`p-3 bg-[#2d3449] rounded-xl border-l-2 ${flow[`${slot}Enabled`] ? "border-[#4edea3]" : "border-[#494454]"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-[#dae2fd]">Bot {i + 1}</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flow[`${slot}Enabled`]}
                    onChange={(e) => onFlowChange({ [`${slot}Enabled`]: e.target.checked })}
                    className="sr-only"
                  />
                  <div
                    className="w-8 h-4 rounded-full transition-colors relative"
                    style={{ background: flow[`${slot}Enabled`] ? "#a078ff" : "#494454" }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow"
                      style={{ left: flow[`${slot}Enabled`] ? "calc(100% - 14px)" : "2px" }}
                    />
                  </div>
                </label>
              </div>
              <select
                value={models[slot]}
                onChange={(e) => setModel(slot, e.target.value)}
                disabled={!flow[`${slot}Enabled`]}
                className="w-full bg-[#060e20] text-[#dae2fd] rounded-lg px-2 py-1.5 text-xs border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40 disabled:opacity-40"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                {groupedModels.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.models.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}

          <div className="space-y-2 pt-2 border-t border-[#494454]/20">
            <h4 className="text-[10px] uppercase tracking-widest text-[#cbc3d7]/60" style={{ fontFamily: "JetBrains Mono, monospace" }}>Merge Steps</h4>

            <div className="flex justify-between items-center p-3 bg-[#171f33] rounded-xl">
              <div>
                <p className="text-xs font-medium text-[#dae2fd]">Merge Bot 1 + 2</p>
                <p className="text-[10px] text-[#cbc3d7]/60">Step A synthesis</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flow.merge12Enabled}
                  onChange={(e) => onFlowChange({ merge12Enabled: e.target.checked })}
                  className="sr-only"
                />
                <div
                  className="w-8 h-4 rounded-full transition-colors relative"
                  style={{ background: flow.merge12Enabled ? "#a078ff" : "#2d3449" }}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow"
                    style={{ left: flow.merge12Enabled ? "calc(100% - 14px)" : "2px" }}
                  />
                </div>
              </label>
            </div>

            <div className="flex justify-between items-center p-3 bg-[#171f33] rounded-xl">
              <div>
                <p className="text-xs font-medium text-[#dae2fd]">Merge (1+2) + 3</p>
                <p className="text-[10px] text-[#cbc3d7]/60">Step B synthesis</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flow.merge123Enabled}
                  onChange={(e) => onFlowChange({ merge123Enabled: e.target.checked })}
                  className="sr-only"
                />
                <div
                  className="w-8 h-4 rounded-full transition-colors relative"
                  style={{ background: flow.merge123Enabled ? "#a078ff" : "#2d3449" }}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow"
                    style={{ left: flow.merge123Enabled ? "calc(100% - 14px)" : "2px" }}
                  />
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Synthesis model */}
      {flow.mode === "super" && (
        <div>
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#cbc3d7] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Synthesis Model</h3>
          <SynthModelSelector groupedModels={groupedModels} />
        </div>
      )}

      <div className="p-4 bg-[#2d3449] rounded-xl border border-[#d0bcff]/10">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[#d0bcff] text-sm">verified</span>
          <span className="text-[10px] uppercase tracking-tighter text-[#dae2fd]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Verified Output</span>
        </div>
        <p className="text-xs text-[#cbc3d7] leading-relaxed">Cross-model synthesis captures the strongest insights from all active bots.</p>
      </div>
    </section>
  );
}

function SynthModelSelector({ groupedModels }: { groupedModels: typeof GROUPED_MODELS }) {
  const { models, setModel } = useSettingsStore();
  return (
    <select
      value={models.synth}
      onChange={(e) => setModel("synth", e.target.value)}
      className="w-full bg-[#060e20] text-[#dae2fd] rounded-lg px-3 py-2 text-sm border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40"
    >
      {groupedModels.map((g) => (
        <optgroup key={g.group} label={g.group}>
          {g.models.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export default function WorkspacePage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { conversations, activeConversationId, messages, flow, isLoading, setConversations, setActiveConversation, setMessages, appendMessage, setFlow, setLoading, removeConversation } = useChatStore();
  const { providerKeys, models, useOpenRouterDev, setModels } = useSettingsStore();

  const [auth, setAuth] = useState<"loading" | "anon" | "authed">("loading");
  const [freeModelIds, setFreeModelIds] = useState<string[] | null>(null);

  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<UsageViewState>({
    mode: "daily",
    runs: 0,
    apiCalls: 0,
    runLimit: 10,
    apiCallLimit: 30,
  });
  const [streamingStatus, setStreamingStatus] = useState("");
  const [streamingPreview, setStreamingPreview] = useState("");
  const [mobileTab, setMobileTab] = useState<"chat" | "flow">("chat");
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showLocalReset, setShowLocalReset] = useState(false);
  const [streamBlocks, setStreamBlocks] = useState<StreamBlock[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastConversationIdRef = useRef<string | null>(null);

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = (await res.json()) as UsageViewState;
        setUsage({
          mode: data.mode,
          runs: data.runs ?? 0,
          apiCalls: data.apiCalls ?? 0,
          runLimit: data.runLimit ?? 10,
          apiCallLimit: data.apiCallLimit ?? 30,
          credit_balance_cents: data.credit_balance_cents,
          free_runs_remaining: data.free_runs_remaining,
        });
      }
    } catch { /* ignore */ }
  }, []);

  const groupedModelsForUi = useMemo(() => {
    if (!freeModelIds?.length) return GROUPED_MODELS;
    return filterGroupedModels(new Set(freeModelIds));
  }, [freeModelIds]);

  const mobileUsageLine = useMemo(() => {
    const { primary, secondary } = usagePrimarySecondary(usage);
    return secondary ? `${primary} · ${secondary}` : primary;
  }, [usage]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.status === 401) {
        setAuth("anon");
        return;
      }
      if (res.ok) {
        const data = await res.json() as { conversations: ConversationRecord[] };
        setConversations(data.conversations);
        const id = useChatStore.getState().activeConversationId;
        if (id && !data.conversations.some((c) => c.id === id)) {
          setActiveConversation(null);
          setMessages([]);
        }
      }
    } catch { /* ignore */ }
  }, [router, setConversations, setActiveConversation, setMessages]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => {
        setAuth(d.authenticated ? "authed" : "anon");
      })
      .catch(() => setAuth("anon"));
  }, []);

  useEffect(() => {
    fetch("/api/showcase")
      .then((r) => r.json())
      .then((d: { showcase?: boolean }) => setShowcaseMode(Boolean(d.showcase)))
      .catch(() => setShowcaseMode(false));
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      setShowLocalReset(h === "localhost" || h === "127.0.0.1");
    }
  }, []);

  useEffect(() => {
    if (auth !== "authed") return;
    void loadConversations();
    void loadUsage();
  }, [auth, loadConversations, loadUsage]);

  useEffect(() => {
    if (auth !== "authed") return;
    const ac = new AbortController();
    fetch("/api/billing", { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (b: {
          billing_enforced?: boolean;
          tier?: string;
          owner_unlimited?: boolean;
          free_model_ids?: string[] | null;
        } | null) => {
          if (!b) {
            setFreeModelIds(null);
            return;
          }
          if (b.billing_enforced && b.tier === "free" && !b.owner_unlimited && Array.isArray(b.free_model_ids)) {
            const allowed = new Set(b.free_model_ids);
            setFreeModelIds(b.free_model_ids);
            const clamped = clampModelConfigToAllowed(useSettingsStore.getState().models, allowed);
            setModels(clamped);
          } else {
            setFreeModelIds(null);
          }
        }
      )
      .catch(() => setFreeModelIds(null));
    return () => ac.abort();
  }, [auth, setModels]);

  /** Stick to bottom only if the user is already near the bottom; always jump when switching chats. */
  useEffect(() => {
    const convChanged = lastConversationIdRef.current !== activeConversationId;
    lastConversationIdRef.current = activeConversationId;

    const scrollToEnd = (behavior: ScrollBehavior) => {
      messagesEndRef.current?.scrollIntoView({ block: "end", behavior });
    };

    if (convChanged) {
      scrollToEnd("auto");
      return;
    }

    const root = messagesScrollRef.current;
    if (!root) {
      scrollToEnd("auto");
      return;
    }

    const thresholdPx = 140;
    const fromBottom = root.scrollHeight - root.scrollTop - root.clientHeight;
    if (fromBottom <= thresholdPx) {
      const streaming = Boolean(isLoading && (streamingPreview || streamingStatus));
      scrollToEnd(streaming ? "auto" : "smooth");
    }
  }, [activeConversationId, messages, streamingPreview, streamingStatus, isLoading]);

  async function selectConversation(id: string) {
    setHistoryOpen(false);
    setActiveConversation(id);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setFlow(data.conversation.flow);
      } else if (res.status === 404) {
        setActiveConversation(null);
        setMessages([]);
        removeConversation(id);
        void loadConversations();
      }
    } catch { /* ignore */ }
  }

  function newChat() {
    setActiveConversation(null);
    setMessages([]);
  }

  async function deleteConversation(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    removeConversation(id);
    if (activeConversationId === id) newChat();
  }

  async function handleResetLimits() {
    try {
      const r = await fetch("/api/usage/reset", { method: "POST" });
      if (r.ok) await loadUsage();
    } catch {
      /* ignore */
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (showcaseMode) return;
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    setError("");
    setStreamingPreview("");
    setStreamingStatus("Starting…");
    setStreamBlocks([]);
    setLoading(true);
    setPrompt("");

    const messagesSnapshot = [...useChatStore.getState().messages];

    const optimisticUser: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: activeConversationId ?? "",
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    appendMessage(optimisticUser);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          conversationId: activeConversationId ?? undefined,
          providerKeys,
          ...(process.env.NODE_ENV === "development"
            ? { devRouting: useOpenRouterDev ? "openrouter" : "direct" }
            : {}),
          prompt: trimmed,
          flow,
          stream: true,
          models: Object.fromEntries(
            Object.entries(models).map(([k, v]) => [k, v ?? ""])
          ),
        }),
      });

      if (!res.ok) {
        const rawText = await res.text();
        let errMsg = `Request failed (${res.status})`;
        if (rawText) {
          try {
            const j = JSON.parse(rawText) as { error?: string; message?: string };
            if (typeof j.message === "string" && j.message.trim()) errMsg = j.message;
            else if (j.error) errMsg = j.error;
          } catch {
            errMsg = rawText.slice(0, 300);
          }
        }
        setError(errMsg);
        setMessages(messagesSnapshot);
        setStreamingPreview("");
        setStreamingStatus("");
        setStreamBlocks([]);
        return;
      }

      if (!res.body) {
        setError("No response body from server");
        setMessages(messagesSnapshot);
        setStreamingPreview("");
        setStreamingStatus("");
        setStreamBlocks([]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      type DonePayload = {
        conversationId: string;
        finalAnswer: string;
        botOutputs: BotRunOutput[];
      };
      // Object holder: TS does not narrow `let` assigned inside nested functions.
      const streamResult: { payload: DonePayload | null } = { payload: null };

      const processSseBlock = (block: string) => {
        const line = block.trim();
        if (!line.startsWith("data: ")) return;
        let evt: Record<string, unknown>;
        try {
          evt = JSON.parse(line.slice(6)) as Record<string, unknown>;
        } catch {
          return;
        }
        const typ = evt.type as string;
        if (typ === "status") setStreamingStatus(String(evt.message ?? ""));
        if (typ === "phase_start") {
          const phase = String(evt.phase ?? "");
          const label = String(evt.label ?? "");
          setStreamBlocks((prev) => {
            if (prev.some((b) => b.phase === phase)) return prev;
            return [...prev, { phase, label, text: "" }];
          });
        }
        if (typ === "token") {
          const phase = String(evt.phase ?? "");
          const delta = String(evt.delta ?? "");
          setStreamBlocks((prev) => {
            const idx = prev.findIndex((b) => b.phase === phase);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], text: next[idx].text + delta };
            return next;
          });
          setStreamingPreview((p) => p + delta);
        }
        if (typ === "error") {
          throw new Error(String(evt.message ?? "Stream error"));
        }
        if (typ === "done") {
          const cid = evt.conversationId;
          const fa = evt.finalAnswer;
          const bo = evt.botOutputs;
          if (typeof cid === "string" && typeof fa === "string" && Array.isArray(bo)) {
            streamResult.payload = {
              conversationId: cid,
              finalAnswer: fa,
              botOutputs: bo as BotRunOutput[],
            };
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const block of parts) processSseBlock(block);
      }
      if (buffer.trim()) {
        for (const block of buffer.split("\n\n")) processSseBlock(block);
      }

      if (!streamResult.payload) {
        throw new Error("Stream ended without a result — try again.");
      }

      const donePayload = streamResult.payload;
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId: donePayload.conversationId,
        role: "assistant",
        content: donePayload.finalAnswer,
        botOutputs: donePayload.botOutputs,
        createdAt: Date.now(),
      };

      if (donePayload.conversationId !== activeConversationId) {
        setActiveConversation(donePayload.conversationId);
        setMessages([optimisticUser, assistantMsg]);
      } else {
        appendMessage(assistantMsg);
      }

      setStreamingPreview("");
      setStreamingStatus("");
      setStreamBlocks([]);
      loadConversations();
      loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
      setMessages(messagesSnapshot);
      setStreamingPreview("");
      setStreamingStatus("");
      setStreamBlocks([]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleSignOut() {
    await signOut({ redirectUrl: "/workspace" });
  }

  const enabledCount = [flow.bot1Enabled, flow.bot2Enabled, flow.bot3Enabled].filter(Boolean).length;

  if (auth === "loading") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#0b1326] text-[#cbc3d7]">
        Loading…
      </div>
    );
  }

  if (auth === "anon") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#0b1326] text-[#dae2fd]">
        <header className="border-b border-[#494454]/15 px-4 py-4 flex items-center justify-between safe-top">
          <span className="font-semibold">Orchestrator</span>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-[#494454]/20 bg-[#131b2e] p-8 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in to run the orchestrator</h1>
            <p className="text-sm text-[#cbc3d7] leading-relaxed">
              After you sign in, you get one free successful run on approved low-cost models. Upgrade for flagship models and higher limits.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl font-semibold w-full"
              style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", color: "#340080" }}
            >
              Sign in
            </Link>
            <p className="text-[11px] text-[#cbc3d7]/60">
              Use the Sign in / Sign up buttons (top right) or this link — powered by Clerk.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#0b1326] overscroll-none">
      {showLocalReset && (
        <button
          type="button"
          onClick={handleResetLimits}
          className="fixed left-3 z-[70] px-3 py-2.5 rounded-xl text-[11px] font-mono bg-[#222a3d] text-[#ffb4ab] border border-[#ffb4ab]/25 hover:bg-[#2d3449] transition-colors shadow-lg bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-4 lg:left-4"
          title="Clears today’s run/API counters in SQLite"
        >
          Reset limits
        </button>
      )}
      {/* Sidebar — desktop only */}
      {historyOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setHistoryOpen(false)}
          />
          <aside className="relative w-[min(100%,20rem)] max-w-[85vw] bg-[#131b2e] h-full shadow-2xl flex flex-col border-r border-[#494454]/25 safe-top safe-bottom">
            <div className="flex items-center justify-between p-4 border-b border-[#494454]/15">
              <span className="font-bold text-[#dae2fd]">History</span>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="min-h-10 min-w-10 rounded-xl bg-[#222a3d] flex items-center justify-center text-[#d0bcff]"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                newChat();
                setHistoryOpen(false);
              }}
              className="mx-3 mt-3 min-h-12 rounded-xl bg-[#222a3d] text-[#d0bcff] text-sm font-semibold border border-[#d0bcff]/15"
            >
              New chat
            </button>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {conversations.length === 0 && <p className="text-xs text-[#94a3b8] px-2 py-4">No chats yet</p>}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void selectConversation(c.id)}
                  className={`w-full min-h-12 text-left px-3 py-2.5 rounded-xl text-sm transition-colors truncate ${
                    activeConversationId === c.id ? "bg-[#222a3d] text-[#dae2fd]" : "text-[#94a3b8] hover:bg-[#222a3d]/80"
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-[#494454]/15 text-[10px] text-[#cbc3d7]/60 font-mono">
              {mobileUsageLine}
            </div>
          </aside>
        </div>
      )}

      <div className="hidden lg:flex">
        <SideNav
          conversations={conversations}
          activeId={activeConversationId}
          usage={usage}
          onSelect={selectConversation}
          onNew={newChat}
          onNav={(page) => router.push(page === "settings" ? "/settings" : "/workspace")}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 lg:ml-64 flex-col overflow-hidden min-h-0">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-8 min-h-14 py-2 lg:py-0 lg:h-16 bg-[#0b1326]/90 backdrop-blur-xl z-40 border-b border-[#494454]/10 flex-shrink-0 safe-top">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="lg:hidden min-h-11 min-w-11 shrink-0 rounded-xl bg-[#222a3d] flex items-center justify-center text-[#d0bcff]"
              aria-label="Open history"
            >
              <span className="material-symbols-outlined text-[22px]">menu</span>
            </button>
            <span className="font-semibold text-[#dae2fd] hidden lg:block truncate">Orchestrator</span>
            <span className="font-semibold text-[#dae2fd] lg:hidden text-sm truncate">Multibot</span>
            <div className="h-4 w-[1px] bg-[#494454]/30 hidden lg:block" />
            <span className="hidden lg:block text-[11px] text-[#cbc3d7] bg-[#222a3d] px-2 py-0.5 rounded" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              v2.0.0-stable
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex lg:hidden gap-0.5 bg-[#222a3d] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setMobileTab("chat")}
                className={`min-h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${mobileTab === "chat" ? "bg-[#131b2e] text-[#d0bcff]" : "text-[#94a3b8]"}`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("flow")}
                className={`min-h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${mobileTab === "flow" ? "bg-[#131b2e] text-[#d0bcff]" : "text-[#94a3b8]"}`}
              >
                Flow
              </button>
            </div>
            <button
              type="button"
              onClick={newChat}
              className="hidden lg:flex px-4 py-2 min-h-10 bg-[#222a3d] rounded-xl text-sm font-semibold text-[#d0bcff] border border-[#d0bcff]/20 hover:bg-[#31394d] transition-all"
            >
              New Chat
            </button>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="min-h-11 min-w-11 rounded-xl bg-[#2d3449] flex items-center justify-center"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-[#d0bcff] text-[22px]">key</span>
            </button>
          </div>
        </header>

        {showcaseMode && (
          <div className="flex-shrink-0 mx-3 sm:mx-4 lg:mx-8 mt-2 mb-1 px-3 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-100/95 text-xs sm:text-sm leading-snug">
            <span className="font-semibold">Showcase</span>
            <span className="text-amber-100/80"> — UI-only demo; chat disabled.</span>
          </div>
        )}

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Chat column */}
          <section className={`flex-1 flex flex-col relative border-r border-[#494454]/5 min-h-0 ${mobileTab === "flow" ? "hidden lg:flex" : "flex"}`}>
            {/* Messages */}
            <div
              ref={messagesScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8 pb-[calc(12rem+env(safe-area-inset-bottom))] lg:pb-48"
            >
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20">
                  <div className="w-16 h-16 rounded-2xl mb-6 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", boxShadow: "0 8px 24px rgba(208,188,255,0.2)" }}>
                    <span className="material-symbols-outlined text-2xl text-[#340080]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <h2 className="text-xl font-bold text-[#dae2fd] mb-2">MultiBot Orchestrator</h2>
                  <p className="text-[#cbc3d7] text-sm max-w-sm">
                    Ask anything. {flow.mode === "super" ? `${enabledCount} bots run in order with live streaming, then merges when enabled.` : "One model streams the answer token by token."}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isLoading && (
                <div className="max-w-3xl mx-auto space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-[#2d3449] animate-pulse flex-shrink-0 flex items-center justify-center mt-1">
                      <span className="material-symbols-outlined text-sm text-[#d0bcff]">smart_toy</span>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono uppercase tracking-wide text-[#4edea3]">Live</span>
                        {streamingStatus && (
                          <span className="text-xs text-[#d0bcff] bg-[#171f33] px-2 py-0.5 rounded-lg border border-[#494454]/20">
                            {streamingStatus}
                          </span>
                        )}
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d0bcff] animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#d0bcff]/30" />
                        </span>
                      </div>
                      {streamBlocks.length > 0 ? (
                        <div className="space-y-2">
                          {streamBlocks.map((block) => (
                            <div
                              key={block.phase}
                              className={`rounded-xl border p-3 ${phaseAccentClass(block.phase)}`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[10px] uppercase tracking-wide text-[#d0bcff] font-mono">
                                  {block.label}
                                </span>
                                {block.text ? <CopyTextButton text={block.text} label="Copy" /> : null}
                              </div>
                              <p className="text-xs text-[#dae2fd]/90 whitespace-pre-wrap font-mono leading-relaxed">
                                {block.text || "Waiting…"}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#cbc3d7]/70">Waiting for first tokens…</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-6"
              style={{ background: "linear-gradient(to top, #0b1326 70%, transparent)" }}
            >
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Model quick-select row */}
                <div className="flex flex-wrap items-center gap-2">
                  {flow.mode === "super" ? (
                    BOT_SLOTS.map((slot, i) => (
                      <ModelPill
                        key={slot}
                        slotLabel={`Bot ${i + 1}`}
                        slot={slot}
                        enabled={flow[`${slot}Enabled`]}
                        onToggle={(v) => setFlow({ [`${slot}Enabled`]: v })}
                      />
                    ))
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#222a3d] rounded-full">
                      <span className="text-[10px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        Quick → {modelLabel(models[flow.primarySlot])}
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-[#93000a]/20 border border-[#ffb4ab]/20 rounded-xl px-4 py-2 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#ffb4ab] text-base mt-0.5 flex-shrink-0">error</span>
                    <p className="text-[#ffb4ab] text-sm">
                      {error}
                      {(error.toLowerCase().includes("api key") ||
                        error.toLowerCase().includes("settings") ||
                        error.toLowerCase().includes("missing")) && (
                        <button
                          onClick={() => router.push("/settings")}
                          className="ml-2 underline text-[#d0bcff] hover:text-white transition-colors"
                        >
                          Open Settings →
                        </button>
                      )}
                    </p>
                  </div>
                )}

                {/* Textarea — suppressHydrationWarning: password managers (e.g. NordPass) inject data-np-* attrs */}
                <form onSubmit={handleSubmit} suppressHydrationWarning>
                  <div className="bg-[#222a3d] rounded-2xl p-2 shadow-2xl border border-[#494454]/10">
                    <div className="flex items-end gap-2 px-2 py-1">
                      <textarea
                        suppressHydrationWarning
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={showcaseMode ? "Showcase: chat disabled…" : "Ask anything…"}
                        rows={1}
                        disabled={showcaseMode}
                        className="flex-1 bg-transparent border-none outline-none text-[#dae2fd] placeholder:text-[#cbc3d7]/50 py-3 resize-none text-base sm:text-sm disabled:opacity-50 min-h-[48px]"
                        style={{ fontFamily: "Inter, sans-serif", maxHeight: "200px" }}
                      />
                      <button
                        type="submit"
                        disabled={showcaseMode || isLoading || !prompt.trim()}
                        className="rounded-xl min-h-12 min-w-12 sm:min-w-0 sm:px-4 py-3 font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 flex-shrink-0 shadow-lg"
                        style={{
                          background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                          color: "#340080",
                          boxShadow: "0 4px 16px rgba(208,188,255,0.2)",
                        }}
                        aria-label={flow.mode === "super" ? "Run orchestration" : "Send message"}
                      >
                        <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <span className="hidden sm:inline">{flow.mode === "super" ? "Run" : "Ask"}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-4 px-4 py-1.5 border-t border-[#494454]/10">
                      <span className="text-[10px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {flow.mode === "super" ? `${enabledCount} model${enabledCount !== 1 ? "s" : ""} active` : `Quick mode`}
                      </span>
                      <span className="text-[10px] text-[#cbc3d7]/50">↵ Send  ⇧↵ Newline</span>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>

          {/* Flow panel — desktop always visible, mobile togglable */}
          <div className={`${mobileTab === "flow" ? "flex flex-1 min-h-0" : "hidden"} lg:flex lg:min-h-0`}>
            <FlowPanel flow={flow} onFlowChange={setFlow} groupedModels={groupedModelsForUi} />
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t border-[#494454]/10 bg-[#131b2e]/95 backdrop-blur-md z-50 safe-bottom pt-1">
        <button
          type="button"
          onClick={() => router.push("/workspace")}
          className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#d0bcff]"
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
          <span className="text-[10px] font-medium">Chat</span>
        </button>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]"
        >
          <span className="material-symbols-outlined text-2xl">key</span>
          <span className="text-[10px] font-medium">Keys</span>
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]"
        >
          <span className="material-symbols-outlined text-2xl">logout</span>
          <span className="text-[10px] font-medium">Out</span>
        </button>
      </div>
    </div>
  );
}

function ModelPill({
  slotLabel,
  slot,
  enabled,
  onToggle,
}: {
  slotLabel: string;
  slot: "bot1" | "bot2" | "bot3";
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  const models = useSettingsStore((s) => s.models);
  const label = modelLabel(models[slot]);

  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`flex items-center gap-1.5 min-h-10 px-3 py-2 rounded-full text-[11px] sm:text-[11px] font-medium transition-all active:scale-[0.98] ${
        enabled
          ? "bg-[#222a3d] border border-[#d0bcff]/20 text-[#dae2fd]"
          : "bg-[#131b2e] border border-[#494454]/20 text-[#94a3b8]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-[#4edea3]" : "bg-[#494454]"}`} />
      {slotLabel}: {label}
    </button>
  );
}
