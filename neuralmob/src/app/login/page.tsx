"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const raw = await res.text();
      let data: { error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { error?: string }) : {};
      } catch {
        setError(res.ok ? "Invalid response from server" : `Server error (${res.status})`);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not continue");
      } else {
        router.push("/workspace");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom bg-[#0b1326] relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 network-bg opacity-30 pointer-events-none" />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-20%] w-[70%] max-w-md aspect-square rounded-full blur-[100px] bg-[#d0bcff]/[0.07]" />
        <div className="absolute bottom-[-10%] right-[-15%] w-[60%] max-w-sm aspect-square rounded-full blur-[90px] bg-[#4edea3]/[0.05]" />
      </div>

      <main className="relative z-10 w-full max-w-[min(100%,24rem)]">
        <header className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-[#131b2e] mb-5 ring-1 ring-[#494454]/20">
            <span className="material-symbols-outlined text-[#d0bcff] text-3xl">hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#dae2fd] mb-2">
            MultiBot Orchestrator
          </h1>
          <p className="text-[#cbc3d7] text-sm sm:text-base leading-relaxed px-1">
            Enter your email to open the workspace. Add your own API keys in Settings — nothing is stored on the server.
          </p>
        </header>

        <section className="glass-panel p-5 sm:p-7 rounded-2xl shadow-2xl border border-[#494454]/15">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block px-1 text-[10px] uppercase tracking-widest text-[#cbc3d7]/70 font-mono"
              >
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#958ea0] text-xl pointer-events-none">
                  alternate_email
                </span>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[52px] rounded-xl py-3.5 pl-12 pr-4 bg-[#060e20] text-[#dae2fd] text-base border-none outline-none focus:ring-2 focus:ring-[#d0bcff]/35 placeholder:text-[#958ea0]/45"
                />
              </div>
            </div>

            {error && <p className="text-[#ffb4ab] text-sm text-center leading-snug">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[52px] relative rounded-xl font-bold text-base shadow-lg transition-all active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100"
              style={{
                background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                color: "#340080",
                boxShadow: "0 8px 24px rgba(208,188,255,0.18)",
              }}
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Opening…" : "Continue"}
                {!loading && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
              </span>
            </button>
          </form>
        </section>

        <p className="mt-8 text-center text-[11px] sm:text-xs text-[#cbc3d7]/55 leading-relaxed max-w-xs mx-auto">
          Demo login only — no password or verification. Use keys you trust; they are sent to this app only when you run a chat.
        </p>
      </main>
    </div>
  );
}
