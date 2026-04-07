"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettingsStore } from "@/store/settings-store";

export default function SettingsPage() {
  const { openRouterKey, setOpenRouterKey } = useSettingsStore();
  const [draft, setDraft] = useState(openRouterKey);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Local-only MVP. Your OpenRouter key is stored in browser localStorage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="sk-or-v1-..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button
            onClick={() => {
              setOpenRouterKey(draft);
            }}
          >
            Save Key
          </Button>
          <div className="text-sm text-muted-foreground">
            Current status: {openRouterKey ? "Configured" : "Missing key"}
          </div>
        </CardContent>
      </Card>
      <Link href="/" className="text-sm text-blue-600 underline">
        Back to chat
      </Link>
    </main>
  );
}
