"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ChatMode } from "@/lib/types";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Mode</p>
        <p className="text-xs text-muted-foreground">
          {mode === "quick" ? "Quick (1 model)" : "Super (all enabled models + synthesis)"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="mode-switch" className="text-xs">
          Quick
        </Label>
        <Switch
          id="mode-switch"
          checked={mode === "super"}
          onCheckedChange={(checked) => onChange(checked ? "super" : "quick")}
        />
        <Label htmlFor="mode-switch" className="text-xs">
          Super
        </Label>
      </div>
    </div>
  );
}
