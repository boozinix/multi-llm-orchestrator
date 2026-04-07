"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/chat-store";
import { useSettingsStore } from "@/store/settings-store";
import { GROUPED_MODELS, modelLabel } from "@/lib/constants";
import { FlowDiagram } from "./FlowDiagram";
import type { ConversationRecord, ChatMessage, BotRunOutput, FlowConfig } from "@/lib/types";

const BOT_SLOTS = ["bot1", "bot2", "bot3"] as const;

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
  usage: { runs: number; apiCalls: number };
  onSelect: (id: string) => void;
  onNew: () => void;
  onNav: (page: "workspace" | "settings") => void;
  onSignOut: () => void;
}) {
  const runPct = Math.min(100, (usage.runs / 10) * 100);

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
            <span className="text-[11px] text-[#d0bcff]" style={{ fontFamily: "JetBrains Mono, monospace" }}>{usage.runs}/10 runs</span>
          </div>
          <div className="h-1.5 w-full bg-[#2d3449] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${runPct}%`, background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", boxShadow: "0 0 12px 2px rgba(160,120,255,0.3)" }}
            />
          </div>
          <p className="text-[10px] text-[#cbc3d7]/50 mt-1">{usage.apiCalls}/30 API calls</p>
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
      <div className="flex gap-4 max-w-3xl mx-auto">
        <div className="w-8 h-8 rounded-lg bg-[#222a3d] flex-shrink-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-sm text-[#cbc3d7]">person</span>
        </div>
        <div>
          <p className="text-[#dae2fd] leading-relaxed">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 max-w-3xl mx-auto">
      <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)", boxShadow: "0 4px 12px rgba(208,188,255,0.2)" }}>
        <span className="material-symbols-outlined text-sm text-[#340080]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
      </div>
      <div className="space-y-4 flex-1">
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
        <div className="bg-[#131b2e] p-6 rounded-2xl space-y-4 border border-[#494454]/10">
          <p className="text-[#dae2fd] leading-relaxed whitespace-pre-wrap">{msg.content}</p>

          {msg.botOutputs && msg.botOutputs.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-[#494454]/10">
              {msg.botOutputs.map((bot) => (
                <BotOutputCard key={bot.slotId} bot={bot} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BotOutputCard({ bot }: { bot: BotRunOutput }) {
  const [expanded, setExpanded] = useState(false);
  const label = modelLabel(bot.model);

  return (
    <div className="p-3 bg-[#171f33] rounded-xl border border-[#494454]/5">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
        <span className="text-[10px] text-[#cbc3d7] uppercase" style={{ fontFamily: "JetBrains Mono, monospace" }}>{label}</span>
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

function FlowPanel({ flow, onFlowChange }: { flow: FlowConfig; onFlowChange: (p: Partial<FlowConfig>) => void }) {
  const { models, setModel } = useSettingsStore();

  return (
    <section className="w-80 bg-[#131b2e] overflow-y-auto p-5 hidden lg:flex flex-col gap-6">

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
            {GROUPED_MODELS.map((g) => (
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
          <SynthModelSelector />
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

function SynthModelSelector() {
  const { models, setModel } = useSettingsStore();
  return (
    <select
      value={models.synth}
      onChange={(e) => setModel("synth", e.target.value)}
      className="w-full bg-[#060e20] text-[#dae2fd] rounded-lg px-3 py-2 text-sm border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40"
    >
      {GROUPED_MODELS.map((g) => (
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
  const { conversations, activeConversationId, messages, flow, isLoading, setConversations, setActiveConversation, setMessages, appendMessage, setFlow, setLoading, removeConversation } = useChatStore();
  const { openRouterKey, models } = useSettingsStore();

  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState({ runs: 0, apiCalls: 0 });
  const [streamingStatus, setStreamingStatus] = useState("");
  const [streamingPreview, setStreamingPreview] = useState("");
  const [mobileTab, setMobileTab] = useState<"chat" | "flow">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (res.ok) {
        const data = await res.json();
        setUsage({ runs: data.runs, apiCalls: data.apiCalls });
      }
    } catch { /* ignore */ }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.status === 401) {
        router.push("/login");
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
    loadConversations();
    loadUsage();
  }, [loadConversations, loadUsage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingPreview, streamingStatus, isLoading]);

  async function selectConversation(id: string) {
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
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    const trimmedKey = typeof openRouterKey === "string" ? openRouterKey.trim() : "";

    setError("");
    setStreamingPreview("");
    setStreamingStatus("Starting…");
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
          apiKey: trimmedKey,
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
            const j = JSON.parse(rawText) as { error?: string };
            if (j.error) errMsg = j.error;
          } catch {
            errMsg = rawText.slice(0, 300);
          }
        }
        setError(errMsg);
        setMessages(messagesSnapshot);
        setStreamingPreview("");
        setStreamingStatus("");
        return;
      }

      if (!res.body) {
        setError("No response body from server");
        setMessages(messagesSnapshot);
        setStreamingPreview("");
        setStreamingStatus("");
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
          const label = String(evt.label ?? "");
          setStreamingPreview((p) => (p ? `${p}\n\n` : "") + `── ${label} ──\n\n`);
        }
        if (typ === "token") {
          const delta = String(evt.delta ?? "");
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
      loadConversations();
      loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — please try again");
      setMessages(messagesSnapshot);
      setStreamingPreview("");
      setStreamingStatus("");
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
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const enabledCount = [flow.bot1Enabled, flow.bot2Enabled, flow.bot3Enabled].filter(Boolean).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b1326]">
      <button
        type="button"
        onClick={handleResetLimits}
        className="fixed bottom-24 lg:bottom-4 left-4 z-[70] px-3 py-2 rounded-xl text-[11px] font-mono bg-[#222a3d] text-[#ffb4ab] border border-[#ffb4ab]/25 hover:bg-[#2d3449] transition-colors shadow-lg"
        title="Clears today’s run/API counters in SQLite (remove this button later)"
      >
        Reset limits
      </button>
      {/* Sidebar — desktop only */}
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
      <div className="flex flex-1 lg:ml-64 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-8 h-14 lg:h-16 bg-[#0b1326]/80 backdrop-blur-xl z-40 border-b border-[#494454]/10 flex-shrink-0">
          {/* Mobile: show menu icon */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#dae2fd] hidden lg:block">Orchestrator</span>
            <span className="font-semibold text-[#dae2fd] lg:hidden">Multibot Pro</span>
            <div className="h-4 w-[1px] bg-[#494454]/30 hidden lg:block" />
            <span className="hidden lg:block text-[11px] text-[#cbc3d7] bg-[#222a3d] px-2 py-0.5 rounded" style={{ fontFamily: "JetBrains Mono, monospace" }}>
              v2.0.0-stable
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Mobile flow toggle */}
            <div className="flex lg:hidden gap-1 bg-[#222a3d] rounded-lg p-1">
              <button
                onClick={() => setMobileTab("chat")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${mobileTab === "chat" ? "bg-[#131b2e] text-[#d0bcff]" : "text-[#94a3b8]"}`}
              >
                Chat
              </button>
              <button
                onClick={() => setMobileTab("flow")}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${mobileTab === "flow" ? "bg-[#131b2e] text-[#d0bcff]" : "text-[#94a3b8]"}`}
              >
                Flow
              </button>
            </div>
            <button
              onClick={newChat}
              className="hidden lg:flex px-4 py-1.5 bg-[#222a3d] rounded-lg text-sm font-semibold text-[#d0bcff] border border-[#d0bcff]/20 hover:bg-[#31394d] transition-all"
            >
              New Chat
            </button>
            <button
              onClick={() => router.push("/settings")}
              className="w-8 h-8 rounded-full bg-[#2d3449] flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[#d0bcff]">account_circle</span>
            </button>
          </div>
        </header>

        {/* Content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat column */}
          <section className={`flex-1 flex flex-col relative border-r border-[#494454]/5 ${mobileTab === "flow" ? "hidden lg:flex" : "flex"}`}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-8 pb-48">
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
                      {streamingPreview ? (
                        <div className="bg-[#131b2e] border border-[#494454]/15 rounded-xl p-4 max-h-64 overflow-y-auto">
                          <pre className="text-xs text-[#dae2fd]/90 whitespace-pre-wrap font-mono leading-relaxed">
                            {streamingPreview}
                          </pre>
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
            <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6" style={{ background: "linear-gradient(to top, #0b1326 60%, transparent)" }}>
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
                      {(error.toLowerCase().includes("api key") || error.toLowerCase().includes("settings")) && (
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

                {/* Textarea */}
                <form onSubmit={handleSubmit}>
                  <div className="bg-[#222a3d] rounded-2xl p-2 shadow-2xl border border-[#494454]/10">
                    <div className="flex items-end gap-2 px-2 py-1">
                      <textarea
                        ref={textareaRef}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        rows={1}
                        className="flex-1 bg-transparent border-none outline-none text-[#dae2fd] placeholder:text-[#cbc3d7]/50 py-3 resize-none text-sm"
                        style={{ fontFamily: "Inter, sans-serif", maxHeight: "200px" }}
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        className="rounded-xl px-4 py-3 font-bold text-sm flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40 flex-shrink-0 shadow-lg"
                        style={{
                          background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                          color: "#340080",
                          boxShadow: "0 4px 16px rgba(208,188,255,0.2)",
                        }}
                      >
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                        <span className="hidden sm:inline">{flow.mode === "super" ? `Synthesize` : "Ask"}</span>
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
          <div className={`${mobileTab === "flow" ? "flex flex-1" : "hidden"} lg:flex`}>
            <FlowPanel flow={flow} onFlowChange={setFlow} />
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 flex border-t border-[#494454]/10 bg-[#131b2e] z-50">
        <button
          onClick={() => router.push("/workspace")}
          className="flex-1 flex flex-col items-center py-2 text-[#d0bcff]"
        >
          <span className="material-symbols-outlined text-xl">chat</span>
          <span className="text-[10px] mt-0.5">Chat</span>
        </button>
        <button
          onClick={() => router.push("/settings")}
          className="flex-1 flex flex-col items-center py-2 text-[#94a3b8]"
        >
          <span className="material-symbols-outlined text-xl">settings</span>
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex-1 flex flex-col items-center py-2 text-[#94a3b8]"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          <span className="text-[10px] mt-0.5">Sign Out</span>
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
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
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
