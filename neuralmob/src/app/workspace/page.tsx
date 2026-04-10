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
      "Bots answer independently first, then the merge steps compare and improve the strongest reasoning.",
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
    title: "Choose how many bots reason before you run.",
    description:
      "This panel controls quick versus super mode, which bots are active, and whether the merge steps synthesize Bot 1 + 2 before comparing that result against Bot 3.",
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
  showAdmin: boolean;
  onAdmin: () => void;
  onSignOut: () => void;
}) {
  const { primary: usagePrimary, secondary: usageSecondary } = usagePrimarySecondary(usage);
  const runPct = usageBarPercent(usage);

  return (
    <aside className="h-screen w-72 fixed left-0 top-0 flex flex-col p-4 z-50 overflow-hidden border-r border-white/6 bg-[linear-gradient(180deg,rgba(11,19,38,0.94),rgba(9,16,30,0.98))] backdrop-blur-xl">
      <div className="mb-6 px-2 pt-1 flex items-center gap-3">
        <BrandMark className="w-11 h-11 rounded-2xl flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-[1.75rem] leading-none font-semibold text-[#edf2ff]">Neural Mob</h1>
          <p className="mt-1 text-[11px] text-[#b9c5df]/72">Multi-model orchestration</p>
        </div>
      </div>

      <nav className="space-y-1.5 mb-5">
        <p className="app-eyebrow px-3 pb-1 text-[#aeb9d5]/56">Navigate</p>
        <button
          onClick={() => onNav("workspace")}
          className="w-full app-panel-soft text-[#e6dcff] rounded-2xl flex items-center gap-3 px-3.5 py-3 font-semibold text-sm text-left"
        >
          <AppIcon name="chat" className="h-5 w-5" />
          Chat
        </button>
        <button
          onClick={() => onNav("settings")}
          className="w-full text-[#96a5c6] rounded-2xl flex items-center gap-3 px-3.5 py-3 font-medium text-sm text-left hover:bg-[#1a2237] hover:text-[#e8eefc]"
        >
          <AppIcon name="key" className="h-5 w-5" />
          API Keys
        </button>
        <button
          onClick={() => onNav("settings")}
          className="w-full text-[#96a5c6] rounded-2xl flex items-center gap-3 px-3.5 py-3 font-medium text-sm text-left hover:bg-[#1a2237] hover:text-[#e8eefc]"
        >
          <AppIcon name="settings" className="h-5 w-5" />
          Settings
        </button>
        {showAdmin && (
          <button
            onClick={onAdmin}
            className="w-full text-[#7cefc0] rounded-2xl flex items-center gap-3 px-3.5 py-3 font-medium text-sm text-left hover:bg-[#132335]"
          >
            <AppIcon name="admin" className="h-5 w-5" />
            Admin
          </button>
        )}
      </nav>

      {/* History */}
      <div data-tour="history-panel" className="flex-1 overflow-y-auto space-y-1">
        <p className="app-eyebrow px-3 mb-2 text-[#aeb9d5]/56">History</p>
        {conversations.length === 0 && (
          <div className="app-panel-soft rounded-2xl px-4 py-4 mx-1">
            <p className="text-sm text-[#9dadcd]">No conversations yet</p>
            <p className="mt-1 text-xs text-[#6f7c99]">Your orchestration runs will appear here with titles.</p>
          </div>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`w-full text-left px-3.5 py-3 rounded-2xl text-sm transition-colors truncate ${
              activeId === c.id
                ? "app-panel-soft text-[#edf2ff]"
                : "text-[#96a5c6] hover:bg-[#161f33] hover:text-[#edf2ff]"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>

      {/* Usage bar */}
      <div className="mt-4 space-y-3">
        <div className="app-panel rounded-[1.4rem] p-4 shimmer-edge">
          <div className="flex justify-between items-center mb-2.5">
            <span className="app-eyebrow text-[#b9c5df]/66">Usage</span>
            <span className="text-[11px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usagePrimary}</span>
          </div>
          <div className="h-2 w-full bg-[#2d3449] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${runPct}%`, background: "linear-gradient(90deg, #d0bcff 0%, #a078ff 56%, #7b5de9 100%)", boxShadow: "0 0 12px 2px rgba(160,120,255,0.3)" }}
            />
          </div>
          {usageSecondary && (
            <p className="text-[11px] text-[#9eadcc] mt-2">{usageSecondary}</p>
          )}
        </div>

        <div className="space-y-1">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-medium text-[#edf2ff] bg-[#171f33] hover:bg-[#1d2740] transition-colors rounded-2xl"
          >
            <AppIcon name="add" className="h-[1.05rem] w-[1.05rem]" />
            New Chat
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-medium text-[#9aa8c7] hover:bg-[#161f33] hover:text-[#edf2ff] transition-colors rounded-2xl"
          >
            <AppIcon name="logout" className="h-[1.05rem] w-[1.05rem]" />
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
  groupedModels: PickerModelGroup[];
}) {
  const { models, setModel } = useSettingsStore();
  const canMerge12 = flow.bot1Enabled && flow.bot2Enabled;
  const canMerge123 = canMerge12 && flow.bot3Enabled && flow.merge12Enabled;

  return (
    <section data-tour="flow-panel" className="w-full lg:w-80 lg:min-w-[20rem] bg-[#131b2e] overflow-y-auto p-4 sm:p-5 flex flex-col gap-5 lg:gap-6 min-h-0">

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
                  <option key={m.value} value={m.value} disabled={m.disabled}>
                    {m.displayLabel}
                  </option>
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
            <h4 className="text-[10px] uppercase tracking-widest text-[#cbc3d7]/60" style={{ fontFamily: "JetBrains Mono, monospace" }}>Merge Steps</h4>

            <div className="flex justify-between items-center p-3 bg-[#171f33] rounded-xl">
              <div>
                <p className="text-xs font-medium text-[#dae2fd]">Merge Bot 1 + 2</p>
                <p className="text-[10px] text-[#cbc3d7]/60">
                  {canMerge12 ? "Step A synthesis" : "Requires Bot 1 and Bot 2"}
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

            <div className="flex justify-between items-center p-3 bg-[#171f33] rounded-xl">
              <div>
                <p className="text-xs font-medium text-[#dae2fd]">Merge (1+2) + 3</p>
                <p className="text-[10px] text-[#cbc3d7]/60">
                  {canMerge123 ? "Step B synthesis" : "Enable Step A and Bot 3 first"}
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
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#cbc3d7] mb-3" style={{ fontFamily: "JetBrains Mono, monospace" }}>Synthesis Model</h3>
          <SynthModelSelector groupedModels={groupedModels} />
        </div>
      )}

      <div className="p-4 bg-[#2d3449] rounded-xl border border-[#d0bcff]/10">
        <div className="flex items-center gap-2 mb-2">
          <AppIcon name="verified" className="h-4 w-4 text-[#d0bcff]" />
          <span className="text-[10px] uppercase tracking-tighter text-[#dae2fd]" style={{ fontFamily: "JetBrains Mono, monospace" }}>Verified Output</span>
        </div>
        <p className="text-xs text-[#cbc3d7] leading-relaxed">Cross-model synthesis captures the strongest insights from all active bots.</p>
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
          showAdmin={ownerUnlimited}
          onAdmin={() => router.push("/admin")}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 lg:ml-72 flex-col overflow-hidden min-h-0">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-2 px-3 sm:px-4 lg:px-8 min-h-14 py-2 lg:py-0 lg:h-16 bg-[#0b1326]/90 backdrop-blur-xl z-40 border-b border-[#494454]/10 flex-shrink-0 safe-top">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              data-tour="history-button"
              className="lg:hidden min-h-11 min-w-11 shrink-0 rounded-xl bg-[#222a3d] flex items-center justify-center text-[#d0bcff]"
              aria-label="Open history"
            >
              <AppIcon name="menu" className="h-[1.35rem] w-[1.35rem]" />
            </button>
            <div className="min-w-0">
              <span className="font-semibold text-[#edf2ff] hidden lg:block truncate">Neural Mob</span>
              <span className="font-semibold text-[#edf2ff] lg:hidden text-sm truncate">Neural Mob</span>
              <p className="hidden lg:block text-[11px] text-[#93a1c1] mt-0.5">Orchestration workspace</p>
            </div>
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
              onClick={() => {
                setTourStep(0);
                setTourOpen(true);
              }}
              className="min-h-11 rounded-xl px-3 sm:px-3.5 text-sm font-medium text-[#b7c4df] bg-[#171f33] hover:bg-[#1d2740] transition-colors flex items-center justify-center gap-2"
              aria-label="Open guide"
            >
              <AppIcon name="help" className="h-[1.05rem] w-[1.05rem]" />
              <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              type="button"
              onClick={newChat}
              className="hidden lg:flex px-4 py-2 min-h-10 app-panel-soft rounded-xl text-sm font-semibold text-[#edf2ff]"
            >
              New Chat
            </button>
            {ownerUnlimited && (
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="hidden lg:flex px-4 py-2 min-h-10 rounded-xl text-sm font-semibold text-[#4edea3] border border-[#4edea3]/18 bg-[#111d2f] hover:bg-[#13253a] transition-all"
              >
                Admin
              </button>
            )}
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
                <div className="h-full flex items-center">
                  <div className="max-w-5xl w-full mx-auto grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
                    <div className="text-left">
                      <p className="app-eyebrow mb-4">Neural Mob</p>
                      <h2 className="app-hero-title text-4xl md:text-5xl xl:text-[5.25rem] text-[#edf2ff] max-w-2xl">
                        Ask once. Compare, merge, and synthesize across models.
                      </h2>
                      <p className="mt-5 max-w-xl text-base md:text-lg text-[#b4bed6] leading-8">
                        {flow.mode === "super"
                          ? `${enabledCount} bots are active right now. Neural Mob runs them in sequence, streams each phase live, and merges where your flow allows it.`
                          : "Quick mode sends a single model straight through with full streaming and conversation history."}
                      </p>
                      <div className="mt-8 flex flex-wrap gap-3">
                        <div className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Live phase streaming</div>
                        <div className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Model-by-model reasoning</div>
                        <div className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Final synthesis layer</div>
                      </div>
                    </div>
                    <div className="app-panel rounded-[2rem] p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div>
                          <p className="app-eyebrow mb-1">Current Flow</p>
                          <h3 className="text-2xl font-semibold text-[#edf2ff]">{flow.mode === "super" ? "Super mode" : "Quick mode"}</h3>
                        </div>
                        <BrandMark className="h-14 w-14 rounded-[1.35rem] float-soft" glyphClassName="h-7 w-7" />
                      </div>
                      <div className="rounded-[1.5rem] bg-[#0d1525] border border-white/6 p-4">
                        <FlowDiagram flow={flow} models={models} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {BOT_SLOTS.map((slot, i) => (
                          <div key={slot} className="rounded-2xl bg-[#111b2f] px-3 py-2 border border-white/6">
                            <p className="text-[10px] uppercase tracking-widest text-[#8e9ab8] font-mono">Bot {i + 1}</p>
                            <p className="mt-1 text-sm text-[#edf2ff] truncate">{modelLabel(models[slot])}</p>
                          </div>
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
              ref={composerRef}
              className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 lg:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-6"
              style={{ background: "linear-gradient(to top, #0b1326 70%, transparent)" }}
            >
              <div className="max-w-5xl mx-auto space-y-3">
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
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a2237] rounded-full border border-white/6">
                      <span className="text-[10px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        Quick → {modelLabel(models[flow.primarySlot])}
                      </span>
                    </div>
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
                  <div data-tour="composer-shell" className="app-panel rounded-[1.75rem] p-2.5 shadow-2xl">
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
                        className="rounded-[1.15rem] min-h-14 min-w-14 sm:min-w-0 sm:px-5 py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 flex-shrink-0 shadow-lg"
                        style={{
                          background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                          color: "#340080",
                          boxShadow: "0 14px 36px rgba(160,120,255,0.22)",
                        }}
                        aria-label={flow.mode === "super" ? "Run orchestration" : "Send message"}
                      >
                        <BrandGlyph className="h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" />
                        <span className="hidden sm:inline">{flow.mode === "super" ? "Run Neural Mob" : "Send"}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-2 border-t border-white/6">
                      <span className="text-[10px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                        {flow.mode === "super" ? `${enabledCount} model${enabledCount !== 1 ? "s" : ""} active` : `Quick mode`}
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
