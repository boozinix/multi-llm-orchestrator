"use client";

function Node({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <div
      className={`rounded border px-2 py-1 text-xs font-medium ${
        muted ? "border-dashed text-muted-foreground" : "bg-background"
      }`}
    >
      {label}
    </div>
  );
}

export function FlowCanvas({
  merge12Enabled,
  merge123Enabled,
}: {
  merge12Enabled: boolean;
  merge123Enabled: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-xs">
      <div className="grid grid-cols-3 gap-3">
        <Node label="Bot 1" />
        <Node label="Bot 2" />
        <Node label="Bot 3" />
      </div>
      <div className="text-center text-muted-foreground">↓ parallel responses</div>
      <div className="flex items-center justify-center">
        <Node label="Bot 1 + 2 Combined" muted={!merge12Enabled} />
      </div>
      <div className="text-center text-muted-foreground">↓</div>
      <div className="flex items-center justify-center">
        <Node label="Bot (1+2) + 3 Combined" muted={!merge123Enabled} />
      </div>
      <div className="text-center text-muted-foreground">↓</div>
      <div className="flex items-center justify-center">
        <Node label="Final Answer" />
      </div>
    </div>
  );
}
