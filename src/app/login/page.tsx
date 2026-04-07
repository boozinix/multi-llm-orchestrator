"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>MultiBot Orchestrator</CardTitle>
          <CardDescription>Enter your authorized email to continue.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            className="w-full"
            disabled={loading || !email.trim()}
            onClick={async () => {
              try {
                setLoading(true);
                setError(null);
                const response = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                if (!response.ok) {
                  const data = await response.json().catch(() => ({}));
                  throw new Error(data.error ?? "Login failed.");
                }
                router.replace("/");
                router.refresh();
              } catch (loginError) {
                setError(loginError instanceof Error ? loginError.message : "Login failed.");
              } finally {
                setLoading(false);
              }
            }}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
