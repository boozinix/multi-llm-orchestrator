"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/lib/types";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Start a conversation to see responses from your selected models.
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-14rem)] pr-4">
      <div className="space-y-4 py-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg border p-3 text-sm ${
              message.role === "user"
                ? "ml-auto max-w-[85%] border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30"
                : "mr-auto max-w-[90%] bg-background"
            }`}
          >
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {message.role}
            </div>
            <p className="whitespace-pre-wrap leading-6">{message.content}</p>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
