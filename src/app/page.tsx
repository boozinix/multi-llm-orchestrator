"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, Plus } from "lucide-react";
import { Composer } from "@/components/chat/composer";
import { MessageList } from "@/components/chat/message-list";
import { ModeToggle } from "@/components/chat/mode-toggle";
import { FlowCanvas } from "@/components/flow/flow-canvas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { OPENROUTER_MODELS } from "@/lib/constants";
import { apiCreateConversation, apiListConversations, apiLoadConversation, apiSendChat } from "@/lib/api";
import type { BotSlotId, ChatMessage } from "@/lib/types";
import { useChatStore } from "@/store/chat-store";
import { useSettingsStore } from "@/store/settings-store";

function createLocalMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function Home() {
  const {
    conversations,
    activeConversationId,
    messages,
    mode,
    flow,
    loading,
    error,
    setConversations,
    setActiveConversationId,
    setMessages,
    appendMessage,
    setMode,
    setFlowEnabled,
    setMerge12Enabled,
    setMerge123Enabled,
    setFlow,
    setLoading,
    setError,
  } = useChatStore();
  const {
    openRouterKey,
    models,
    setModelForSlot,
    setPrimarySlot,
    setSynthModel,
  } = useSettingsStore();

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        const existing = await apiListConversations();
        setConversations(existing);
        let nextActive = existing[0]?.id ?? null;
        if (!nextActive) {
          const created = await apiCreateConversation();
          setConversations([created]);
          nextActive = created.id;
        }
        setActiveConversationId(nextActive);
        const loaded = await apiLoadConversation(nextActive);
        setMessages(loaded.messages);
        setFlow(loaded.conversation.flow);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to initialize app.");
      } finally {
        setLoading(false);
      }
    }
    void bootstrap();
  }, [setActiveConversationId, setConversations, setError, setFlow, setLoading, setMessages]);

  const persistConversationState = async (conversationId: string) => {
    await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId,
        flow,
        models,
      }),
    });
  };

  const sendMessage = async (prompt: string) => {
    if (!activeConversationId) return;
    if (!openRouterKey) {
      setError("Missing OpenRouter key. Add it in Settings.");
      return;
    }
    const userMessage = createLocalMessage("user", prompt);
    appendMessage(userMessage);
    try {
      setError(null);
      setLoading(true);
      await persistConversationState(activeConversationId);
      const result = await apiSendChat({
        conversationId: activeConversationId,
        mode,
        prompt,
        messages: [...messages, userMessage],
        flow,
        models,
        openRouterKey,
      });
      appendMessage(createLocalMessage("assistant", result.finalAnswer));
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Chat request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen grid-cols-1 gap-4 bg-muted/20 p-4 lg:grid-cols-[260px_1fr_360px]">
      <Card className="h-[calc(100vh-2rem)]">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Conversations</CardTitle>
          <Button
            size="icon"
            variant="outline"
            onClick={async () => {
              const conversation = await apiCreateConversation();
              setConversations([conversation, ...conversations]);
              setActiveConversationId(conversation.id);
              setMessages([]);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              className={`w-full rounded-md border p-2 text-left text-sm ${
                activeConversationId === conversation.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : ""
              }`}
              onClick={async () => {
                setActiveConversationId(conversation.id);
                const loaded = await apiLoadConversation(conversation.id);
                setMessages(loaded.messages);
                setFlow(loaded.conversation.flow);
              }}
            >
              {conversation.title || "New conversation"}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className="h-[calc(100vh-2rem)]">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>MultiBot Orchestrator</CardTitle>
            <p className="text-sm text-muted-foreground">
              Run quick single-model answers or super synthesized responses.
            </p>
          </div>
          <Link href="/settings" className="text-sm text-blue-600 underline">
            Settings
          </Link>
        </CardHeader>
        <CardContent className="flex h-[calc(100%-5rem)] flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex-1">
            <MessageList messages={messages} />
          </div>
          <Composer disabled={loading} onSend={sendMessage} />
        </CardContent>
      </Card>

      <Card className="h-[calc(100vh-2rem)]">
        <CardHeader>
          <CardTitle className="text-base">Flow + Models</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModeToggle mode={mode} onChange={setMode} />
          <FlowCanvas merge12Enabled={flow.merge12Enabled} merge123Enabled={flow.merge123Enabled} />
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Enable Bot1 + Bot2 combine step</p>
              <Switch
                checked={flow.merge12Enabled}
                onCheckedChange={(checked) => setMerge12Enabled(checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Enable (Bot1+2) + Bot3 combine step</p>
              <Switch
                checked={flow.merge123Enabled}
                onCheckedChange={(checked) => setMerge123Enabled(checked)}
              />
            </div>
          </div>
          {(["bot1", "bot2", "bot3"] as BotSlotId[]).map((slotId) => (
            <div key={slotId} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{slotId.toUpperCase()}</Badge>
                <div className="flex items-center gap-2 text-xs">
                  enabled
                  <Switch
                    checked={flow.slots[slotId].enabled}
                    onCheckedChange={(checked) => setFlowEnabled(slotId, checked)}
                  />
                </div>
              </div>
              <Select value={models[slotId]} onValueChange={(value) => setModelForSlot(slotId, value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPENROUTER_MODELS.map((modelId) => (
                    <SelectItem key={modelId} value={modelId}>
                      {modelId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant={models.primary === slotId ? "default" : "outline"}
                onClick={() => setPrimarySlot(slotId)}
              >
                Set as quick mode model
              </Button>
            </div>
          ))}
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">Synthesis model</p>
            <Select value={models.synthModel} onValueChange={setSynthModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPENROUTER_MODELS.map((modelId) => (
                  <SelectItem key={modelId} value={modelId}>
                    {modelId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
