"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  onSend: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Ask MultiBot Orchestrator anything..."
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        className="min-h-24"
      />
      <div className="flex justify-end">
        <Button
          disabled={disabled || value.trim().length === 0}
          onClick={async () => {
            const next = value.trim();
            if (!next) return;
            setValue("");
            await onSend(next);
          }}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
