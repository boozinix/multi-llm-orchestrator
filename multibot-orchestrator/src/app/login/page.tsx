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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Access denied");
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
    <div className="min-h-screen flex items-center justify-center overflow-hidden relative bg-[#0b1326]">
      {/* Background blobs */}
      <div className="fixed inset-0 z-0 network-bg opacity-40" />
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ background: "rgba(208,188,255,0.08)" }} />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full blur-[100px]" style={{ background: "rgba(78,222,163,0.05)" }} />
      </div>

      {/* Decorative model nodes */}
      <div className="fixed top-20 right-[15%] w-32 h-32 opacity-20 pointer-events-none hidden md:block">
        <div className="relative w-full h-full">
          <div className="absolute top-0 right-0 p-2 rounded-lg bg-[#2d3449] border border-[#d0bcff]/20">
            <span className="material-symbols-outlined text-[#d0bcff]" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
          </div>
          <div className="absolute bottom-4 left-0 p-2 rounded-lg bg-[#2d3449] border border-[#4edea3]/20 scale-75">
            <span className="material-symbols-outlined text-[#4edea3]">model_training</span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-20 rotate-45" style={{ background: "linear-gradient(to bottom, transparent, rgba(208,188,255,0.5), transparent)" }} />
        </div>
      </div>

      {/* Main card */}
      <main className="relative z-10 w-full max-w-md px-6">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-[#131b2e] mb-6">
            <span className="material-symbols-outlined text-[#d0bcff] text-3xl">hub</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-[#dae2fd] mb-3" style={{ fontFamily: "Inter, sans-serif" }}>
            MultiBot Orchestrator
          </h1>
          <p className="text-[#cbc3d7] text-base leading-relaxed max-w-[280px] mx-auto">
            Orchestrate GPT-4, Claude, and Gemini in a single workspace.
          </p>
        </header>

        <section className="glass-panel p-8 rounded-2xl shadow-2xl border border-[#494454]/15">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block px-1 text-[10px] uppercase tracking-widest text-[#cbc3d7]/70"
                style={{ fontFamily: "JetBrains Mono, monospace" }}
              >
                Authorization Endpoint
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#958ea0] text-lg pointer-events-none">
                  alternate_email
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.ai"
                  className="w-full rounded-xl py-4 pl-12 pr-4 bg-[#060e20] text-[#dae2fd] border-none outline-none focus:ring-1 focus:ring-[#d0bcff]/40 placeholder:text-[#958ea0]/50 transition-all duration-300"
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              </div>
            </div>

            {error && (
              <p className="text-[#ffb4ab] text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full relative overflow-hidden rounded-xl py-4 font-bold shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)",
                color: "#340080",
                fontFamily: "Inter, sans-serif",
                boxShadow: "0 8px 24px rgba(208,188,255,0.2)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? "Verifying..." : "Continue with Email"}
                {!loading && (
                  <span className="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                )}
              </span>
            </button>

            <div className="flex items-center gap-4 py-2">
              <div className="h-[1px] flex-1 bg-[#494454]/30" />
              <span className="text-[#958ea0]/50 text-[10px] uppercase tracking-widest" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                Protocol: Secure
              </span>
              <div className="h-[1px] flex-1 bg-[#494454]/30" />
            </div>
          </form>
        </section>

        <footer className="mt-8 text-center space-y-4">
          <p className="text-xs text-[#cbc3d7]/60 leading-relaxed px-4">
            Personal access only. By entering, you accept the usage terms.{" "}
            <span className="text-[#4edea3] font-medium">10 runs/day limit.</span>
          </p>
          <div className="flex items-center justify-center gap-6 opacity-40">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">security</span>
              <span className="text-[10px]" style={{ fontFamily: "JetBrains Mono, monospace" }}>AES-256</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">bolt</span>
              <span className="text-[10px]" style={{ fontFamily: "JetBrains Mono, monospace" }}>v2.0.0-stable</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Status bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 px-4 py-2 rounded-full glass-panel border border-[#494454]/10">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
          <span className="text-[9px] uppercase tracking-tighter text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            System Ready
          </span>
        </div>
        <div className="w-[1px] h-3 bg-[#494454]/30 my-auto" />
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-tighter text-[#cbc3d7]" style={{ fontFamily: "JetBrains Mono, monospace" }}>
            Nodes: 03 Active
          </span>
        </div>
      </div>
    </div>
  );
}
