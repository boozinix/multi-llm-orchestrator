"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { BrandGlyph, BrandMark } from "@/components/brand-mark";
import { AppIcon } from "@/components/app-icon";
import { WorkspaceTour, type WorkspaceTourStep } from "@/components/workspace-tour";
import { useChatStore } from "@/store/chat-store";
import { useSettingsStore } from "@/store/settings-store";
import {
  modelLabel,
  buildSelectableModelGroups,
  clampModelConfigToAllowed,
  type PickerModelGroup,
} from "@/lib/constants";
import { FlowDiagram } from "./FlowDiagram";
import type { ConversationRecord, ChatMessage, BotRunOutput, FlowConfig } from "@/lib/types";

const BOT_SLOTS = ["bot1", "bot2", "bot3"] as const;
const TOUR_STORAGE_PREFIX = "neuralmob-tour";

function getTimeGreeting(): string {
  if (typeof window === "undefined") return "Good morning";
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const PROMPT_SUGGESTIONS = [
  { tag: "strategy", q: "Raise a seed round at $5M, or bootstrap to $1M ARR first?", minds: ["gpt", "claude", "gemini"], mode: "super" },
  { tag: "code review", q: "Review this PR for load-bearing risks before I merge.", minds: ["gpt", "claude", "gemini"], mode: "super" },
  { tag: "writing", q: "Rewrite this email to be less corporate and more me.", minds: ["gpt", "claude", "gemini"], mode: "super" },
  { tag: "pricing", q: "Price this product at $29 or $39 — gut vs. data.", minds: ["gpt", "claude", "gemini"], mode: "super" },
];

const WORKSPACE_TOUR_STEPS: WorkspaceTourStep[] = [
  {
    id: "overview",
    eyebrow: "Welcome to Neural Mob",
    title: "One prompt in. Independent model reasoning out.",
    description:
      "Neural Mob lets you run one model or a small reasoning chain, watch each phase stream live, and end with a stronger synthesized answer.",
    detail:
      "This quick walkthrough shows the controls new members need first, and you can reopen it any time from Guide in the top bar.",
    bullets: [
      "Quick mode sends one model straight through. Super mode turns on multi-bot orchestration.",
      "Each mind answers independently, then merge steps compare and improve the strongest reasoning.",
      "Your history, settings, limits, and final answers all stay inside the workspace.",
    ],
  },
  {
    id: "history",
    eyebrow: "History",
    title: "Your runs stay organized here.",
    description:
      "Every orchestration becomes a titled session so you can reopen it, compare old runs, and continue the same thread instead of starting over.",
    detail:
      "On desktop this lives in the left rail. On mobile, use the menu button to get back to recent sessions.",
    selector: "[data-tour='history-panel']",
    mobileSelector: "[data-tour='history-button']",
    mobileTab: "chat",
  },
  {
    id: "flow",
    eyebrow: "Flow setup",
    title: "Choose how many minds reason before you run.",
    description:
      "This panel controls quick versus super mode, which minds are active, and whether the merge steps synthesize Mind 1 + 2 before comparing that result against Mind 3.",
    detail:
      "The merge toggles are dependency-aware, so invalid orchestration chains cannot be enabled anymore.",
    selector: "[data-tour='flow-panel']",
    mobileSelector: "[data-tour='flow-panel']",
    mobileTab: "flow",
  },
  {
    id: "settings",
    eyebrow: "Settings",
    title: "Keys, billing, and routing live one tap away.",
    description:
      "Use Settings to manage provider keys locally, review billing limits, and control how Neural Mob routes requests.",
    detail:
      "If a run is blocked by missing credentials or billing rules, this is the first place to check.",
    selector: "[data-tour='settings-button']",
    mobileSelector: "[data-tour='settings-button']",
    mobileTab: "chat",
  },
  {
    id: "composer",
    eyebrow: "Run it",
    title: "Ask clearly, then let the flow do the work.",
    description:
      "Write your prompt here and send it. Neural Mob will stream each phase, save the final answer back into the session, and keep the conversation ready for the next turn.",
    detail:
      "Enter sends immediately, Shift+Enter adds a new line, and the same composer works for both quick and super mode.",
    selector: "[data-tour='composer-shell']",
    mobileSelector: "[data-tour='composer-shell']",
    mobileTab: "chat",
  },
];

type AuthMePayload = {
  authenticated?: boolean;
  email?: string | null;
  provider?: string | null;
};

type UsageViewState = {
  mode?: string;
  runs: number;
  apiCalls: number;
  runLimit: number;
  apiCallLimit: number;
  credit_balance_cents?: number;
  reserved_credit_cents?: number;
  available_credit_cents?: number;
  free_runs_remaining?: number;
};

function usagePrimarySecondary(u: UsageViewState): { primary: string; secondary: string | null } {
  const mode = u.mode ?? "daily";
  if (mode === "free_credits") {
    const usd = ((u.available_credit_cents ?? u.credit_balance_cents ?? 0) / 100).toFixed(2);
    return {
      primary: `$${usd} free credit`,
      secondary: usd === "0.00" ? "Top up to continue" : "Low-cost models only",
    };
  }
  if (mode === "paid_credits") {
    const usd = ((u.available_credit_cents ?? u.credit_balance_cents ?? 0) / 100).toFixed(2);
    const reserved = ((u.reserved_credit_cents ?? 0) / 100).toFixed(2);
    return { primary: `$${usd} credits`, secondary: reserved === "0.00" ? null : `$${reserved} reserved` };
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
  if (u.mode === "free_credits" || u.mode === "paid_credits") {
    return (u.available_credit_cents ?? u.credit_balance_cents ?? 0) > 0 ? 100 : 0;
  }
  if (u.runLimit > 0) return Math.min(100, (u.runs / u.runLimit) * 100);
  return 0;
}

type StreamBlock = {
  phase: string;
  label: string;
  text: string;
};

/** GPT and Gemini routed through OpenRouter often have higher cold-start latency. */
function isSlowStartModel(model: string): boolean {
  const m = model.toLowerCase();
  return m.includes("gpt") || m.includes("gemini") || m.includes("o1") || m.includes("o3") || m.includes("o4");
}

function getSlotTimeoutMs(model: string): number {
  return isSlowStartModel(model) ? 25_000 : 12_000;
}

function phaseColor(phase: string): string {
  if (phase === "bot1" || phase === "chain1") return "#4edea3";
  if (phase === "bot2" || phase === "chain2") return "#ff8a6b";
  if (phase === "bot3" || phase === "chain3") return "#d0bcff";
  return "#d0bcff";
}

function phaseAccentClass(phase: string): string {
  if (phase === "bot1" || phase === "chain1") return "border-[#4edea3]/40 bg-[#4edea3]/[0.06]";
  if (phase === "bot2" || phase === "chain2") return "border-[#ff8a6b]/40 bg-[#ff8a6b]/[0.06]";
  if (phase === "bot3" || phase === "chain3") return "border-[#d0bcff]/40 bg-[#d0bcff]/[0.06]";
  if (phase.startsWith("merge")) return "border-[#d0bcff]/25 bg-[#d0bcff]/[0.04]";
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
      className="p-1.5 rounded-md text-[#6b7280] hover:text-[#d0bcff] hover:bg-[#d0bcff]/10 transition-colors"
      title={label}
      aria-label={label}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
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
  onGuide,
  showAdmin,
  onAdmin,
  onSignOut,
}: {
  conversations: ConversationRecord[];
  activeId: string | null;
  usage: UsageViewState;
  onSelect: (id: string) => void;
  onNew: () => void;
  onNav: (page: "workspace" | "settings") => void;
  onGuide: () => void;
  showAdmin: boolean;
  onAdmin: () => void;
  onSignOut: () => void;
}) {
  const { primary: usagePrimary, secondary: usageSecondary } = usagePrimarySecondary(usage);
  const runPct = usageBarPercent(usage);

  return (
    <aside className="h-screen w-72 fixed left-0 top-0 flex flex-col p-4 z-50 overflow-hidden border-r border-white/6 bg-[linear-gradient(180deg,rgba(11,19,38,0.94),rgba(9,16,30,0.98))] backdrop-blur-xl">
      <div className="mb-5 px-1.5 pt-1 flex items-center gap-2.5 pb-3.5 border-b border-dashed border-[#d0bcff]/10">
        <div className="w-7 h-7 rounded-lg flex-shrink-0 grid place-items-center" style={{ background: "linear-gradient(135deg, #d0bcff, #9d87d9)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, color: "#1a0f3a" }}>NM</div>
        <div className="min-w-0">
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, letterSpacing: "-0.01em", color: "#e9e6f5", lineHeight: 1.1 }}>Neural Mob</h1>
          <span style={{ display: "block", fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b6889", marginTop: 2 }}>multi-model orchestration</span>
        </div>
      </div>

      <nav className="space-y-1 mb-4">
        <p className="font-mono tracking-[0.2em] uppercase text-xs text-[#d0bcff] px-3 pb-0.5">Navigate</p>
        <button
          onClick={() => onNav("workspace")}
          className="w-full app-panel-soft text-[#e6dcff] rounded-xl flex items-center gap-2.5 px-3 py-2 font-semibold text-[11px] text-left"
        >
          <AppIcon name="chat" className="h-4 w-4" />
          Chat
        </button>
        <button
          onClick={() => onNav("settings")}
          className="w-full nav-slide text-[#96a5c6] rounded-xl flex items-center gap-2.5 px-3 py-2 font-medium text-[11px] text-left hover:text-[#e8eefc]"
        >
          <AppIcon name="key" className="h-4 w-4" />
          API Keys
        </button>
        <button
          onClick={() => onNav("settings")}
          className="w-full nav-slide text-[#96a5c6] rounded-xl flex items-center gap-2.5 px-3 py-2 font-medium text-[11px] text-left hover:text-[#e8eefc]"
        >
          <AppIcon name="settings" className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={onGuide}
          className="w-full nav-slide text-[#96a5c6] rounded-xl flex items-center gap-2.5 px-3 py-2 font-medium text-[11px] text-left hover:text-[#e8eefc]"
        >
          <AppIcon name="help" className="h-4 w-4" />
          Guide
        </button>
        {showAdmin && (
          <button
            onClick={onAdmin}
            className="w-full nav-slide text-[#7cefc0] rounded-xl flex items-center gap-2.5 px-3 py-2.5 font-medium text-sm text-left hover:text-[#7cefc0]"
          >
            <AppIcon name="admin" className="h-4 w-4" />
            Admin
          </button>
        )}
      </nav>

      {/* History */}
      <div data-tour="history-panel" className="flex-1 overflow-y-auto space-y-0.5">
        <p className="font-mono tracking-[0.2em] uppercase text-xs text-[#d0bcff] px-3 mb-1.5">History</p>
        {conversations.length === 0 && (
          <div className="app-panel-soft rounded-xl px-3 py-3 mx-1">
            <p className="text-xs text-[#9dadcd]">No conversations yet</p>
            <p className="mt-0.5 text-[10px] text-[#6f7c99]">Your runs will appear here.</p>
          </div>
        )}
        {conversations.map((c) => {
          const ago = (() => {
            const diff = Date.now() - c.updatedAt;
            if (diff < 60000) return "just now";
            if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
            return `${Math.floor(diff / 86400000)}d ago`;
          })();
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`w-full text-left px-3 py-2 rounded-xl text-[11px] transition-colors ${
                activeId === c.id
                  ? "app-panel-soft text-[#edf2ff]"
                  : "text-[#96a5c6] hover:bg-[#161f33] hover:text-[#edf2ff]"
              }`}
            >
              <span className="block truncate">{c.title}</span>
              <span className="block mt-0.5 truncate" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, color: "#6b6889", letterSpacing: "0.04em" }}>{ago}</span>
            </button>
          );
        })}
      </div>

      {/* Usage bar */}
      <div className="mt-3 space-y-2">
        <div className="app-panel rounded-xl p-3 shimmer-edge">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[0.68rem] font-mono tracking-[0.2em] uppercase text-[#b9c5df]/66">Usage</span>
            <span className="text-[10px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usagePrimary}</span>
          </div>
          <div className="h-1.5 w-full bg-[#2d3449] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all usage-bar-fill"
              style={{ width: `${runPct}%`, background: "linear-gradient(90deg, #d0bcff 0%, #a078ff 56%, #7b5de9 100%)", boxShadow: "0 0 12px 2px rgba(160,120,255,0.3)" }}
            />
          </div>
          {usageSecondary && (
            <p className="text-[10px] text-[#9eadcc] mt-1.5">{usageSecondary}</p>
          )}
        </div>

        <div className="space-y-0.5">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-[#edf2ff] rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, rgba(160,120,255,0.25) 0%, rgba(100,60,200,0.2) 100%)", border: "1px solid rgba(160,120,255,0.3)" }}
          >
            <AppIcon name="add" className="h-4 w-4 text-[#d0bcff]" />
            New Chat
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#9aa8c7] hover:bg-[#161f33] hover:text-[#edf2ff] transition-colors rounded-xl"
          >
            <AppIcon name="logout" className="h-4 w-4" />
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
          <AppIcon name="person" className="h-[1.1rem] w-[1.1rem] text-[#cbc3d7] sm:h-4 sm:w-4" />
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
        <BrandGlyph className="h-4 w-4 sm:h-[0.95rem] sm:w-[0.95rem]" />
      </div>
      <div className="space-y-3 sm:space-y-4 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-[#d0bcff] font-bold" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Neural Mob
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
              <p className="text-[10px] uppercase tracking-widest text-[#cbc3d7]/70 font-mono">Mind Outputs</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {msg.botOutputs.map((bot) => (
                  <BotOutputCard key={bot.slotId} bot={bot} />
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-[#494454]/10 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] sm:text-base font-medium text-[#d0bcff]">Final Answer</p>
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
  const slotColor = slot === "bot1" ? "#4edea3" : slot === "bot2" ? "#ff8a6b" : "#d0bcff";
  const slotAccent =
    slot === "bot1"
      ? "border-[#4edea3]/35 bg-[#4edea3]/[0.06]"
      : slot === "bot2"
        ? "border-[#ff8a6b]/35 bg-[#ff8a6b]/[0.06]"
        : "border-[#d0bcff]/35 bg-[#d0bcff]/[0.06]";

  return (
    <div className={`p-3 rounded-xl border ${slotAccent}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: slotColor, boxShadow: `0 0 5px ${slotColor}` }} />
          <span className="text-[10px] uppercase" style={{ fontFamily: "JetBrains Mono, monospace", color: slotColor, letterSpacing: "0.06em" }}>
            MIND {slot.replace("bot", "")} · {label}
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
  groupedModels: PickerModelGroup[];
}) {
  const { models, setModel } = useSettingsStore();
  const canMerge12 = flow.bot1Enabled && flow.bot2Enabled;
  const canMerge123 = canMerge12 && flow.bot3Enabled && flow.merge12Enabled;

  return (
    <section data-tour="flow-panel" className="w-full lg:w-80 lg:min-w-[20rem] bg-[#131b2e] overflow-y-auto p-4 sm:p-5 pt-5 sm:pt-6 flex flex-col gap-4 lg:gap-5 min-h-0">

      {/* Live flow diagram */}
      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-[#cbc3d7] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          Execution Flow
        </h3>
        <div className="bg-[#0d1525] rounded-2xl p-3 border border-[#494454]/15">
          <FlowDiagram flow={flow} models={models} />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-[#cbc3d7] mb-4" style={{ fontFamily: "JetBrains Mono, monospace" }}>Mode</h3>
        <div className="flex bg-[#222a3d]/60 rounded-xl p-1 gap-0.5">
          {(["quick", "chain", "super"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onFlowChange({ mode: m })}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                flow.mode === m
                  ? "mode-toggle-active"
                  : "text-[#94a3b8] hover:text-[#dae2fd] hover:bg-[#222a3d]"
              }`}
            >
              {m === "quick" ? "Quick" : m === "chain" ? "Chain" : "Super"}
            </button>
          ))}
        </div>
      </div>

      {flow.mode === "quick" && (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Primary Model</h3>
          <select
            value={models[flow.primarySlot]}
            onChange={(e) => setModel(flow.primarySlot, e.target.value)}
            className="w-full bg-[#060e20] text-[#dae2fd] rounded-lg px-3 py-2 text-sm border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            {groupedModels.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.models.map((m) => (
                  <option key={m.value} value={m.value} disabled={m.disabled}>
                    {m.displayLabel}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-[#cbc3d7]/50">Uses Mind 1 slot. Switch to Chain or Super for multi-model.</p>
        </div>
      )}

      {flow.mode === "chain" && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Sequential Chain</h3>

          {BOT_SLOTS.map((slot, i) => (
            <div key={slot} className={`p-3 bg-[#2d3449] rounded-xl border-l-2 ${flow[`${slot}Enabled`] ? (i === 0 ? "border-l-[#4edea3]" : i === 1 ? "border-l-[#ff8a6b]" : "border-l-[#d0bcff]") : "border-l-[#494454]"}`}>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-xs font-semibold text-[#dae2fd]">Step {i + 1}</span>
                  <span className="text-[10px] text-[#cbc3d7]/50 ml-2" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                    {i === 0 ? "first pass" : "reviews prev."}
                  </span>
                </div>
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
                      <option key={m.value} value={m.value} disabled={m.disabled}>
                        {m.displayLabel}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}

          <p className="text-xs text-[#cbc3d7]/50">Each step reviews and improves the previous answer.</p>
        </div>
      )}

      {flow.mode === "super" && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Orchestration Flow</h3>

          {BOT_SLOTS.map((slot, i) => (
            <div key={slot} className={`p-3 bg-[#2d3449] rounded-xl border-l-2 ${flow[`${slot}Enabled`] ? (i === 0 ? "border-l-[rgba(139,92,246,0.6)]" : i === 1 ? "border-l-[rgba(6,182,212,0.6)]" : "border-l-[rgba(34,197,94,0.6)]") : "border-l-[#494454]"}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-[#dae2fd]">Mind {i + 1}</span>
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
                      <option key={m.value} value={m.value} disabled={m.disabled}>
                        {m.displayLabel}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}

          <div className="space-y-2 pt-2 border-t border-[#494454]/20">
            <h4 className="text-xs uppercase tracking-widest text-[#cbc3d7]/60" style={{ fontFamily: "JetBrains Mono, monospace" }}>Merge Steps</h4>

            <div className="flex justify-between items-center p-3 app-panel-soft rounded-xl">
              <div>
                <p className="text-xs font-medium text-[#dae2fd]">Merge Mind 1 + 2</p>
                <p className="text-xs text-[#cbc3d7]/60">
                  {canMerge12 ? "Step A synthesis" : "Requires Mind 1 and Mind 2"}
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flow.merge12Enabled}
                  disabled={!canMerge12}
                  onChange={(e) => onFlowChange({ merge12Enabled: e.target.checked })}
                  className="sr-only"
                />
                <div
                  className="w-8 h-4 rounded-full transition-colors relative"
                  style={{ background: flow.merge12Enabled ? "#a078ff" : "#2d3449", opacity: canMerge12 ? 1 : 0.45 }}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow"
                    style={{ left: flow.merge12Enabled ? "calc(100% - 14px)" : "2px" }}
                  />
                </div>
              </label>
            </div>

            <div className="flex justify-between items-center p-3 app-panel-soft rounded-xl">
              <div>
                <p className="text-xs font-medium text-[#dae2fd]">Merge (1+2) + 3</p>
                <p className="text-xs text-[#cbc3d7]/60">
                  {canMerge123 ? "Step B synthesis" : "Enable Step A and Mind 3 first"}
                </p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={flow.merge123Enabled}
                  disabled={!canMerge123}
                  onChange={(e) => onFlowChange({ merge123Enabled: e.target.checked })}
                  className="sr-only"
                />
                <div
                  className="w-8 h-4 rounded-full transition-colors relative"
                  style={{ background: flow.merge123Enabled ? "#a078ff" : "#2d3449", opacity: canMerge123 ? 1 : 0.45 }}
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
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#cbc3d7] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Synthesis Model</h3>
          <SynthModelSelector groupedModels={groupedModels} />
        </div>
      )}

      <div className="p-4 bg-[#2d3449] rounded-xl border border-[#d0bcff]/10">
        <div className="flex items-center gap-2 mb-2">
          <AppIcon name="verified" className="h-4 w-4 text-[#d0bcff]" />
          <span className="text-xs uppercase tracking-tighter text-[#dae2fd]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Verified Output</span>
        </div>
        <p className="text-xs text-[#cbc3d7] leading-relaxed">
          {flow.mode === "chain"
            ? "Each step reviews and refines the previous answer for iteratively improved output."
            : "Cross-model synthesis captures the strongest insights from all active minds."}
        </p>
      </div>
    </section>
  );
}

function SynthModelSelector({ groupedModels }: { groupedModels: PickerModelGroup[] }) {
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
            <option key={m.value} value={m.value} disabled={m.disabled}>
              {m.displayLabel}
            </option>
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
  const [ownerUnlimited, setOwnerUnlimited] = useState(false);
  const [streamBlocks, setStreamBlocks] = useState<StreamBlock[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [slotWaiting, setSlotWaiting] = useState<Partial<Record<string, "waiting" | "timed_out" | "responding" | "skipped" | "done">>>({});
  const slotTimerRef = useRef<Partial<Record<string, ReturnType<typeof setTimeout>>>>({});
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourIdentity, setTourIdentity] = useState<string | null>(null);
  const [composerHeight, setComposerHeight] = useState(220);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const lastConversationIdRef = useRef<string | null>(null);
  const hasPromptedTourRef = useRef(false);
  const userScrolledUpRef = useRef(false);

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
          reserved_credit_cents: data.reserved_credit_cents,
          available_credit_cents: data.available_credit_cents,
          free_runs_remaining: data.free_runs_remaining,
        });
      }
    } catch { /* ignore */ }
  }, []);

  const groupedModelsForUi = useMemo(
    () => buildSelectableModelGroups(freeModelIds?.length ? new Set(freeModelIds) : null),
    [freeModelIds]
  );

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
  }, [setConversations, setActiveConversation, setMessages]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: AuthMePayload) => {
        setAuth(d.authenticated ? "authed" : "anon");
        setTourIdentity(d.email ?? d.provider ?? null);
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
    if (typeof window === "undefined") return;

    const updateViewport = () => {
      setIsCompactViewport(window.innerWidth < 1024);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const root = messagesScrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const fromBottom = root.scrollHeight - root.scrollTop - root.clientHeight;
      userScrolledUpRef.current = fromBottom > 140;
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const node = composerRef.current;
    if (!node) return;

    const measure = () => {
      setComposerHeight(Math.ceil(node.getBoundingClientRect().height));
    };

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [flow.mode, flow.bot1Enabled, flow.bot2Enabled, flow.bot3Enabled, error, isLoading, prompt, mobileTab]);

  useEffect(() => {
    if (auth !== "authed" || !tourIdentity || hasPromptedTourRef.current) return;
    hasPromptedTourRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(`${TOUR_STORAGE_PREFIX}:${tourIdentity}`);
      if (!saved) {
        setTourStep(0);
        setTourOpen(true);
      }
    } catch {
      setTourStep(0);
      setTourOpen(true);
    }
  }, [auth, tourIdentity]);

  useEffect(() => {
    if (!tourOpen) return;
    const step = WORKSPACE_TOUR_STEPS[tourStep];
    if (!step) return;
    if (step.mobileTab) setMobileTab(step.mobileTab);
    if (historyOpen && step.id !== "history") {
      setHistoryOpen(false);
    }
    const selector =
      typeof window !== "undefined" && window.innerWidth < 1024 && step.mobileSelector
        ? step.mobileSelector
        : step.selector;
    if (!selector) return;
    const raf = window.requestAnimationFrame(() => {
      const el = document.querySelector(selector) as HTMLElement | null;
      el?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [tourOpen, tourStep, historyOpen]);

  const handleTourClose = useCallback(
    (reason: "dismissed" | "completed") => {
      setTourOpen(false);
      setTourStep(0);
      if (!tourIdentity || typeof window === "undefined") return;
      try {
        const key = `${TOUR_STORAGE_PREFIX}:${tourIdentity}`;
        const current = window.localStorage.getItem(key);
        if (reason === "completed" || !current) {
          window.localStorage.setItem(key, reason);
        }
      } catch {
        /* ignore localStorage issues */
      }
    },
    [tourIdentity]
  );

  const messageListBottomInset = useMemo(() => {
    const fixedNavInset = isCompactViewport ? 76 : 24;
    return `calc(${composerHeight + fixedNavInset}px + env(safe-area-inset-bottom))`;
  }, [composerHeight, isCompactViewport]);

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
            setOwnerUnlimited(false);
            return;
          }
          setOwnerUnlimited(Boolean(b.owner_unlimited));
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
      .catch(() => {
        setFreeModelIds(null);
        setOwnerUnlimited(false);
      });
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
      userScrolledUpRef.current = false;
      scrollToEnd("auto");
      return;
    }

    if (userScrolledUpRef.current) return;

    const root = messagesScrollRef.current;
    if (!root) return;

    // During active streaming, always follow the bottom — DOM growth doesn't fire a
    // scroll event so fromBottom silently grows beyond the threshold without the user
    // having actually scrolled up.
    const activeStreaming = Boolean(isLoading && (streamingPreview || streamingStatus));
    if (activeStreaming) {
      scrollToEnd("auto");
      return;
    }

    const thresholdPx = 200;
    const fromBottom = root.scrollHeight - root.scrollTop - root.clientHeight;
    if (fromBottom <= thresholdPx) {
      scrollToEnd("smooth");
    }
  }, [activeConversationId, messages, streamingPreview, streamingStatus, isLoading, slotWaiting]);

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

  async function handleResetLimits() {
    try {
      const r = await fetch("/api/usage/reset", { method: "POST" });
      if (r.ok) await loadUsage();
    } catch {
      /* ignore */
    }
  }

  function handleWaitMore(phase: string) {
    if (slotTimerRef.current[phase]) {
      clearTimeout(slotTimerRef.current[phase]);
      delete slotTimerRef.current[phase];
    }
    setSlotWaiting((prev) => ({ ...prev, [phase]: "waiting" }));
    const slotModel = models[phase as "bot1" | "bot2" | "bot3"] ?? "";
    const timeoutMs = getSlotTimeoutMs(slotModel);
    const timer = setTimeout(() => {
      setSlotWaiting((prev) => ({ ...prev, [phase]: "timed_out" }));
    }, timeoutMs);
    slotTimerRef.current[phase] = timer;
  }

  async function handleSkipSlot(phase: string) {
    if (!activeRunId) return;
    if (slotTimerRef.current[phase]) {
      clearTimeout(slotTimerRef.current[phase]);
      delete slotTimerRef.current[phase];
    }
    setSlotWaiting((prev) => ({ ...prev, [phase]: "skipped" }));
    try {
      await fetch("/api/chat/skip-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: activeRunId, slotId: phase }),
      });
    } catch {
      /* skip request is best-effort */
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
    setActiveRunId(null);
    // Clear any lingering slot timers from a previous run
    Object.values(slotTimerRef.current).forEach((t) => t && clearTimeout(t));
    slotTimerRef.current = {};
    setSlotWaiting({});
    // Reset scroll lock so a new run always auto-scrolls from the start
    userScrolledUpRef.current = false;
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
            const rawLower = rawText.toLowerCase();
            if (rawLower.includes("<!doctype html") || rawLower.includes("<html")) {
              errMsg =
                res.status === 401
                  ? "Your session expired. Sign in again and retry."
                  : "The server returned an unexpected HTML response. Please refresh and try again.";
            } else {
              errMsg = rawText.slice(0, 300);
            }
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

      const BOT_PHASES = new Set(["bot1", "bot2", "bot3"]);

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

        if (typ === "run_id") {
          setActiveRunId(String(evt.runId ?? ""));
        }
        if (typ === "status") setStreamingStatus(String(evt.message ?? ""));
        if (typ === "phase_start") {
          const phase = String(evt.phase ?? "");
          const label = String(evt.label ?? "");
          setStreamBlocks((prev) => {
            if (prev.some((b) => b.phase === phase)) return prev;
            return [...prev, { phase, label, text: "" }];
          });
          // Start per-model timeout for bot slots
          if (BOT_PHASES.has(phase)) {
            const slotModel = models[phase as "bot1" | "bot2" | "bot3"] ?? "";
            const timeoutMs = getSlotTimeoutMs(slotModel);
            setSlotWaiting((prev) => ({ ...prev, [phase]: "waiting" }));
            const timer = setTimeout(() => {
              setSlotWaiting((prev) => {
                // Only fire if still waiting (not already responding/skipped)
                if (prev[phase] === "waiting") return { ...prev, [phase]: "timed_out" };
                return prev;
              });
            }, timeoutMs);
            slotTimerRef.current[phase] = timer;
          }
        }
        if (typ === "token") {
          const phase = String(evt.phase ?? "");
          const delta = String(evt.delta ?? "");
          // First token from a bot slot — cancel timeout, mark as responding
          if (BOT_PHASES.has(phase)) {
            if (slotTimerRef.current[phase]) {
              clearTimeout(slotTimerRef.current[phase]);
              delete slotTimerRef.current[phase];
            }
            setSlotWaiting((prev) => {
              if (prev[phase] === "waiting" || prev[phase] === "timed_out") {
                return { ...prev, [phase]: "responding" };
              }
              return prev;
            });
          }
          setStreamBlocks((prev) => {
            const idx = prev.findIndex((b) => b.phase === phase);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], text: next[idx].text + delta };
            return next;
          });
          setStreamingPreview((p) => p + delta);
        }
        if (typ === "phase_end") {
          const phase = String(evt.phase ?? "");
          if (slotTimerRef.current[phase]) {
            clearTimeout(slotTimerRef.current[phase]);
            delete slotTimerRef.current[phase];
          }
          setSlotWaiting((prev) => {
            if (prev[phase] === "skipped") return prev; // keep skipped state
            return { ...prev, [phase]: "done" };
          });
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
      // Always clean up slot timers when a run ends
      Object.values(slotTimerRef.current).forEach((t) => t && clearTimeout(t));
      slotTimerRef.current = {};
      setSlotWaiting({});
      setActiveRunId(null);
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
      <div className="min-h-[100dvh] flex flex-col bg-[#0b1326] text-[#dae2fd] app-shell">
        <header className="border-b border-white/6 px-4 py-4 flex items-center justify-between safe-top">
          <span className="app-eyebrow">Neural Mob</span>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl app-panel rounded-[2rem] p-8 md:p-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] items-center">
            <div className="space-y-5">
              <p className="app-eyebrow">Member Access</p>
              <h1 className="app-hero-title text-4xl md:text-5xl text-[#edf2ff]">Sign in to orchestrate multiple models in one place.</h1>
              <p className="text-base text-[#b5c0d8] leading-8 max-w-xl">
                Neural Mob gives every signed-in user starter credit for low-cost models, then unlocks the full catalog once they top up.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-[#dbe5ff]">
                <span className="app-panel-soft rounded-full px-4 py-2">Live orchestration</span>
                <span className="app-panel-soft rounded-full px-4 py-2">Streaming merges</span>
                <span className="app-panel-soft rounded-full px-4 py-2">Strict credit limits</span>
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/8 bg-[#0e1628]/80 p-6 text-center space-y-4">
              <BrandMark className="float-soft mx-auto h-16 w-16 rounded-[1.7rem]" glyphClassName="h-8 w-8" />
              <h2 className="text-xl font-semibold text-[#edf2ff]">Continue with Clerk</h2>
              <p className="text-sm text-[#9dadcd] leading-7">
                Use Google or email to get inside Neural Mob.
              </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center min-h-12 px-6 rounded-xl font-semibold w-full shadow-[0_14px_40px_rgba(160,120,255,0.24)]"
              style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", color: "#340080" }}
            >
              Sign in
            </Link>
            <p className="text-[11px] text-[#73809d]">
              Use the Sign in / Sign up buttons (top right) or this link — powered by Clerk.
            </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#0b1326] overscroll-none app-shell">
      <WorkspaceTour
        open={tourOpen}
        stepIndex={tourStep}
        steps={WORKSPACE_TOUR_STEPS}
        onStepChange={setTourStep}
        onClose={handleTourClose}
      />
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
          <aside className="relative w-[min(100%,21rem)] max-w-[86vw] bg-[linear-gradient(180deg,rgba(11,19,38,0.98),rgba(9,16,30,0.99))] h-full shadow-2xl flex flex-col border-r border-white/8 safe-top safe-bottom">
            <div className="flex items-center justify-between p-4 border-b border-white/6">
              <div>
                <p className="app-eyebrow mb-1">History</p>
                <span className="text-base font-semibold text-[#edf2ff]">Recent sessions</span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="min-h-10 min-w-10 rounded-xl app-panel-soft flex items-center justify-center text-[#d0bcff]"
                aria-label="Close"
              >
                <AppIcon name="close" className="h-5 w-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                newChat();
                setHistoryOpen(false);
              }}
              className="mx-3 mt-3 min-h-12 rounded-2xl bg-[#171f33] text-[#edf2ff] text-sm font-semibold border border-white/6"
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
          onGuide={() => { setTourStep(0); setTourOpen(true); }}
          showAdmin={ownerUnlimited}
          onAdmin={() => router.push("/admin")}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 lg:ml-72 flex-col overflow-hidden min-h-0">
        {/* Mobile-only top bar — desktop has no header since sidebar covers everything */}
        <header className="lg:hidden flex items-center justify-between gap-2 px-3 sm:px-4 min-h-14 py-2 bg-[#0b1326]/90 backdrop-blur-xl z-40 border-b border-[#494454]/10 flex-shrink-0 safe-top">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              data-tour="history-button"
              className="min-h-11 min-w-11 shrink-0 rounded-xl bg-[#222a3d] flex items-center justify-center text-[#d0bcff]"
              aria-label="Open history"
            >
              <AppIcon name="menu" className="h-[1.35rem] w-[1.35rem]" />
            </button>
            <span className="font-semibold text-[#edf2ff] text-sm truncate">Neural Mob</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex gap-0.5 bg-[#222a3d] rounded-xl p-1">
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
              onClick={() => router.push("/settings")}
              data-tour="settings-button"
              className="min-h-11 min-w-11 rounded-xl app-panel-soft flex items-center justify-center"
              aria-label="Settings"
            >
              <AppIcon name="key" className="h-[1.35rem] w-[1.35rem] text-[#d0bcff]" />
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
              className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-8 space-y-6 sm:space-y-8"
              style={{ paddingBottom: messageListBottomInset }}
            >
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col justify-start py-8 lg:py-10">
                  <div style={{ maxWidth: 780, width: "100%", margin: "0 auto", padding: "0 24px" }}>
                  {/* Greeting */}
                  <div>
                    <p className="mb-4" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "#4edea3" }}>
                      ● {getTimeGreeting()} · {flow.mode === "super" ? `${enabledCount} mind${enabledCount !== 1 ? "s" : ""} on call` : flow.mode === "chain" ? `Chain · ${enabledCount} step${enabledCount !== 1 ? "s" : ""}` : "Quick mode · 1 mind"}
                    </p>
                    <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontSize: "clamp(36px,4.5vw,68px)", lineHeight: 0.96, letterSpacing: "-0.03em", margin: "0 0 18px", color: "#e9e6f5", fontVariationSettings: '"opsz" 144' }}>
                      What should <em style={{ fontStyle: "italic", color: "#d0bcff" }}>the mob</em><br />think about today?
                    </h1>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: "#a7a2c2", maxWidth: 500, margin: 0 }}>
                      {flow.mode === "chain"
                        ? "Drop a prompt. Each model reviews and improves the previous answer, refining it step by step."
                        : "Drop a prompt. I\u2019ll send it to all three in parallel, then have Claude read the transcripts and pick the best answer."}
                    </p>
                  </div>

                  {/* Modes mini row */}
                  <div style={{ margin: "24px 0 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "2px solid rgba(208,188,255,.35)", borderRadius: 10, overflow: "hidden" }}>
                      {([
                        { label: "Quick", sub: "mode", kbd: "⌘Q", mode: "quick" as const, stat: "1 model · fast" },
                        { label: "Chain", sub: "review", kbd: "⌘C", mode: "chain" as const, stat: "sequential" },
                        { label: "Super", sub: "default", kbd: "⌘S", mode: "super" as const, stat: "3 + judge" },
                      ] as const).map((m, i, arr) => (
                        <button key={m.mode} type="button" onClick={() => setFlow({ mode: m.mode })}
                          style={{ padding: "13px 15px", borderRight: i < arr.length - 1 ? "2px solid rgba(208,188,255,.35)" : "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: flow.mode === m.mode ? "rgba(208,188,255,.38)" : "transparent", transition: "background .15s" }}>
                          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, padding: "2px 6px", border: `2px solid ${flow.mode === m.mode ? "#d0bcff" : "rgba(208,188,255,.35)"}`, borderRadius: 4, color: flow.mode === m.mode ? "#d0bcff" : "#6b6889" }}>{m.kbd}</span>
                            <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, color: "#e9e6f5", letterSpacing: "-0.01em" }}>{m.label} <em style={{ fontStyle: "italic", color: "#d0bcff", fontWeight: 300, fontSize: 12, marginLeft: 2 }}>{m.sub}</em></span>
                          </div>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#4edea3", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{m.stat}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Suggested prompt cards */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6b6889" }}>§ try one of these</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PROMPT_SUGGESTIONS.map((s) => (
                        <button key={s.q} type="button" onClick={() => setPrompt(s.q)}
                          style={{ border: "2px solid rgba(208,188,255,.28)", borderRadius: 10, padding: "16px 18px", background: "rgba(255,255,255,.015)", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 10, transition: "all .18s" }}
                          className="hover:border-[#d0bcff]/60 hover:bg-[#d0bcff]/[0.06] hover:-translate-y-px">
                          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#d0bcff" }}>{s.tag}</div>
                          <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontSize: 17, lineHeight: 1.35, color: "#e9e6f5", letterSpacing: "-0.01em" }}>&ldquo;{s.q}&rdquo;</div>
                          <div style={{ display: "flex", gap: 5, alignItems: "center", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#6b6889", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: "auto" }}>
                            {s.minds.map((m) => <span key={m} style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: m === "gpt" ? "#4edea3" : m === "claude" ? "#ff8a6b" : "#d0bcff", boxShadow: `0 0 4px ${m === "gpt" ? "#4edea3" : m === "claude" ? "#ff8a6b" : "#d0bcff"}` }} />)}
                            <span style={{ marginLeft: 2 }}>{s.minds.length} mind{s.minds.length !== 1 ? "s" : ""} · {s.mode}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isLoading && (
                <div className="max-w-3xl mx-auto space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-lg bg-[#2d3449] animate-pulse flex-shrink-0 flex items-center justify-center mt-1">
                      <AppIcon name="robot" className="h-4 w-4 text-[#d0bcff]" />
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
                      {streamBlocks.length > 0 ? (() => {
                        const isChainMode = flow.mode === "chain";
                        const chainPhases = new Set(["chain1","chain2","chain3"]);
                        const botBlocks = isChainMode ? [] : streamBlocks.filter((b) => ["bot1","bot2","bot3"].includes(b.phase));
                        const chainBlocks = isChainMode ? streamBlocks.filter((b) => chainPhases.has(b.phase)) : [];
                        const otherBlocks = streamBlocks.filter((b) => !["bot1","bot2","bot3"].includes(b.phase) && !chainPhases.has(b.phase));
                        return (
                          <div className="space-y-2.5">
                            {/* Chain mode: sequential full-width cards */}
                            {chainBlocks.length > 0 && chainBlocks.map((block) => {
                              const color = phaseColor(block.phase);
                              return (
                                <div key={block.phase} style={{ border: `1px solid ${color}40`, borderRadius: 12, background: "rgba(255,255,255,.012)", overflow: "hidden", boxShadow: `0 0 20px -6px ${color}30` }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid rgba(208,188,255,.06)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#e9e6f5" }}>
                                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}`, display: "inline-block", flexShrink: 0 }} />
                                      <span style={{ fontWeight: 500 }}>{block.label}</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      {block.text && <CopyTextButton text={block.text} label="Copy" />}
                                      <span style={{ color }}>● live</span>
                                    </div>
                                  </div>
                                  <div style={{ padding: "12px 16px", fontSize: 13.5, lineHeight: 1.6, color: "#dae2fd", maxHeight: 300, overflow: "hidden" }}>
                                    {block.text || <span style={{ color: "#6b6889" }}>Waiting…</span>}
                                  </div>
                                </div>
                              );
                            })}

                            {botBlocks.length > 0 && (
                              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(botBlocks.length, 3)}, 1fr)`, gap: 8 }}>
                                {botBlocks.map((block) => {
                                  const color = phaseColor(block.phase);
                                  const ws = slotWaiting[block.phase];
                                  const isSkipped = ws === "skipped";
                                  const isTimedOut = ws === "timed_out";
                                  const isWaiting = ws === "waiting";
                                  const slotModel = models[block.phase as "bot1" | "bot2" | "bot3"] ?? "";
                                  const slowModel = isSlowStartModel(slotModel);
                                  const waitLabel = getSlotTimeoutMs(slotModel) / 1000;
                                  const headerStatusColor = isSkipped ? "#6b7280" : isTimedOut ? "#f59e0b" : color;
                                  const headerStatusText = isSkipped ? "○ skipped" : isTimedOut ? "⏱ still waiting" : "● live";
                                  return (
                                    <div key={block.phase} style={{ border: `1px solid ${isSkipped ? "rgba(255,255,255,.06)" : isTimedOut ? "rgba(245,158,11,.35)" : `${color}40`}`, borderRadius: 12, background: isTimedOut ? "rgba(245,158,11,.04)" : "rgba(255,255,255,.012)", overflow: "hidden", boxShadow: isSkipped || isTimedOut ? "none" : `0 0 20px -6px ${color}30` }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid rgba(208,188,255,.06)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 7, color: isSkipped ? "#6b7280" : "#e9e6f5" }}>
                                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: isSkipped ? "#6b7280" : color, boxShadow: isSkipped ? "none" : `0 0 5px ${color}`, display: "inline-block", flexShrink: 0 }} />
                                          <span style={{ fontWeight: 500 }}>{block.label}</span>
                                        </div>
                                        <span style={{ color: headerStatusColor }}>{headerStatusText}</span>
                                      </div>
                                      <div style={{ padding: "10px 13px", fontSize: 12.5, lineHeight: 1.55, color: "#a7a2c2", minHeight: 56, maxHeight: isTimedOut ? "none" : 200, overflow: "hidden" }}>
                                        {isSkipped ? (
                                          <span style={{ color: "#6b7280", fontStyle: "italic" }}>Skipped by you.</span>
                                        ) : isTimedOut ? (
                                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            <span style={{ color: "#f59e0b", fontSize: 11.5 }}>
                                              {slowModel
                                                ? `GPT and Gemini models can take up to ${waitLabel}s to start — still waiting.`
                                                : "Still waiting… taking longer than expected."}
                                            </span>
                                            <div style={{ display: "flex", gap: 6 }}>
                                              <button
                                                type="button"
                                                onClick={() => handleWaitMore(block.phase)}
                                                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(245,158,11,.4)", background: "rgba(245,158,11,.1)", color: "#f59e0b", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.04em", cursor: "pointer" }}
                                              >
                                                Wait {waitLabel}s more
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleSkipSlot(block.phase)}
                                                style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#9dadcd", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.04em", cursor: "pointer" }}
                                              >
                                                Skip {block.label.split(" — ")[0]}
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            {block.text || <span style={{ color: "#6b6889" }}>Waiting…</span>}
                                            {isWaiting && !block.text && slowModel && (
                                              <div style={{ marginTop: 8, fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: "#6b6889", letterSpacing: "0.04em" }}>
                                                GPT &amp; Gemini typically take 15–25s to start.
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {otherBlocks.map((block) => (
                              <div key={block.phase} style={{ border: "1px solid rgba(208,188,255,.2)", borderRadius: 12, background: "rgba(208,188,255,.03)", overflow: "hidden" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid rgba(208,188,255,.06)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#e9e6f5" }}>
                                    <span style={{ width: 20, height: 20, borderRadius: "50%", border: "1px solid #d0bcff", display: "grid", placeItems: "center", fontSize: 10, color: "#d0bcff", flexShrink: 0 }}>Σ</span>
                                    <span>{block.label}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    {block.text && <CopyTextButton text={block.text} label="Copy" />}
                                    <span style={{ color: "#d0bcff" }}>● synthesising</span>
                                  </div>
                                </div>
                                <div style={{ padding: "14px 20px", fontSize: 15, lineHeight: 1.6, color: "#e9e6f5", letterSpacing: "-0.005em", fontFamily: "'Fraunces', Georgia, serif" }}>
                                  {block.text || <span style={{ color: "#6b6889", fontFamily: "Manrope, sans-serif", fontSize: 13 }}>Reading transcripts…</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })() : (
                        <p className="text-sm text-[#cbc3d7]/70">Starting up…</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div
              ref={composerRef}
              className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-6"
              style={{ background: "linear-gradient(to top, #0b1326 70%, transparent)" }}
            >
              <div className="max-w-5xl mx-auto space-y-2">
                {/* Mind pills — compact model status */}
                <div className="flex flex-wrap items-center gap-1.5 px-1">
                  {flow.mode === "super" || flow.mode === "chain" ? (
                    BOT_SLOTS.map((slot, i) => {
                      const enabled = flow[`${slot}Enabled`];
                      const pillColors = ["border-l-[rgba(139,92,246,0.5)]", "border-l-[rgba(6,182,212,0.5)]", "border-l-[rgba(34,197,94,0.5)]"];
                      const stepLabel = flow.mode === "chain" ? `Step ${i + 1}` : `Mind ${i + 1}`;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setFlow({ [`${slot}Enabled`]: !enabled })}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border-l-2 transition-all active:scale-[0.97] ${pillColors[i]} ${
                            enabled ? "app-panel-soft text-[#cbc3d7]" : "bg-[#131b2e]/50 text-[#6b7280] border-l-[#494454]/40"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${enabled ? "bg-[#4edea3]" : "bg-[#494454]"}`} />
                          {stepLabel}: {modelLabel(models[slot]).split("—")[0].trim()}
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-[11px] text-[#8e9ab8] font-mono px-1">
                      Quick → {modelLabel(models[flow.primarySlot]).split("—")[0].trim()}
                    </span>
                  )}
                </div>

                {error && (
                  <div className="bg-[#93000a]/20 border border-[#ffb4ab]/20 rounded-2xl px-4 py-3 flex items-start gap-2">
                    <AppIcon name="error" className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#ffb4ab]" />
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
                  <div data-tour="composer-shell" className="app-panel composer-glass rounded-[1.75rem] p-2.5 shadow-2xl">
                    <div className="flex items-end gap-2 px-2.5 py-1.5">
                      <textarea
                        suppressHydrationWarning
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={showcaseMode ? "Showcase: chat disabled…" : "Ask anything…"}
                        rows={1}
                        disabled={showcaseMode}
                        className="flex-1 bg-transparent border-none outline-none text-[#edf2ff] placeholder:text-[#96a5c6] py-3 resize-none text-base disabled:opacity-50 min-h-[64px]"
                        style={{ fontFamily: "var(--font-family-body)", maxHeight: "200px", lineHeight: "1.65" }}
                      />
                      <button
                        type="submit"
                        disabled={showcaseMode || isLoading || !prompt.trim()}
                        className="btn-shimmer rounded-[1.15rem] min-h-14 min-w-14 sm:min-w-0 sm:px-5 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.96] disabled:opacity-40 flex-shrink-0 shadow-lg"
                        style={{
                          background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                          color: "#340080",
                          boxShadow: "0 14px 36px rgba(160,120,255,0.22)",
                        }}
                        aria-label={flow.mode === "quick" ? "Send message" : "Run orchestration"}
                      >
                        <BrandGlyph className="h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" />
                        <span className="hidden sm:inline">{flow.mode === "quick" ? "Send" : flow.mode === "chain" ? "Run Chain" : "Run Neural Mob"}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-2 border-t border-white/6">
                      <span className="text-[10px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {flow.mode === "super" ? `${enabledCount} model${enabledCount !== 1 ? "s" : ""} active` : flow.mode === "chain" ? `Chain · ${enabledCount} step${enabledCount !== 1 ? "s" : ""}` : `Quick mode`}
                      </span>
                      <span className="text-[10px] text-[#7d89a7]">↵ Send  ⇧↵ Newline</span>
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
          <AppIcon name="chat" className="h-6 w-6" />
          <span className="text-[10px] font-medium">Chat</span>
        </button>
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]"
        >
          <AppIcon name="key" className="h-6 w-6" />
          <span className="text-[10px] font-medium">Keys</span>
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex-1 min-h-14 flex flex-col items-center justify-center gap-0.5 text-[#94a3b8]"
        >
          <AppIcon name="logout" className="h-6 w-6" />
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
  isStreaming,
}: {
  slotLabel: string;
  slot: "bot1" | "bot2" | "bot3";
  enabled: boolean;
  onToggle: (v: boolean) => void;
  isStreaming?: boolean;
}) {
  const models = useSettingsStore((s) => s.models);
  const label = modelLabel(models[slot]);
  const pillIdx = slot === "bot1" ? 1 : slot === "bot2" ? 2 : 3;

  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`bot-pill bot-pill-${pillIdx} flex items-center gap-1 min-h-8 px-2.5 py-1.5 rounded-full text-[10px] font-medium active:scale-[0.98] ${
        enabled
          ? "app-panel-soft text-[#dae2fd]"
          : "bg-[#131b2e]/60 border border-[#494454]/20 text-[#94a3b8]"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${enabled ? (isStreaming ? "bg-[#4edea3] dot-pulse" : "bg-[#4edea3]") : "bg-[#494454]"}`} />
      {slotLabel}: {label}
    </button>
  );
}
