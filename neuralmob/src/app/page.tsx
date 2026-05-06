"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

function streamTokens(el: HTMLElement) {
  const full = el.textContent ?? "";
  el.textContent = "";
  const words = full.split(" ");
  let i = 0;
  const tick = () => {
    if (i >= words.length) return;
    const w = document.createElement("span");
    w.textContent = (i === 0 ? "" : " ") + words[i];
    w.style.cssText = "opacity:0;transition:opacity 0.2s";
    el.appendChild(w);
    requestAnimationFrame(() => { w.style.opacity = "1"; });
    i++;
    setTimeout(tick, 40 + Math.random() * 60);
  };
  tick();
}

const LANES = [
  { key: "gpt",    color: "#4edea3", name: "GPT-5.1",    ms: "1.8s", init: "60%", text: 'Anchor at $39. Price is a signal; $29 reads SMB, $39 reads "real tool."' },
  { key: "claude", color: "#ff8a6b", name: "CLAUDE 4.5", ms: "2.1s", init: "75%", text: "Depends who buys. Champion? $29. Procurement? $39 is invisible." },
  { key: "gemini", color: "#d0bcff", name: "GEMINI 3.1", ms: "2.4s", init: "90%", text: "Neither. Ditch seats. $99 workspace floor + $19/seat over 5." },
] as const;

const PROOF_CELLS = [
  {
    name: "GPT-5.1", color: "#4edea3", conf: "conf 0.82",
    verdict: "● Correct", verdictColor: "#4edea3",
    body: (
      <><strong style={{ color: "#e9e6f5", fontWeight: 500 }}>Anthropic.</strong>{" "}
      <span style={{ color: "#4edea3" }}>~$100M ARR</span> by late 2023. Mistral was still pre-revenue.</>
    ),
  },
  {
    name: "CLAUDE 4.5", color: "#ff8a6b", conf: "conf 0.71",
    verdict: "● Confidently wrong", verdictColor: "#ff8a6b",
    body: (
      <><span style={{ color: "#ff8a6b", textDecoration: "line-through", textDecorationColor: "rgba(255,138,107,.55)" }}>Mistral — around $200M.</span>{" "}
      A 2024 figure hallucinated back to 2023.</>
    ),
  },
  {
    name: "GEMINI 3.1", color: "#d0bcff", conf: "conf 0.44",
    verdict: "● Hedged · correct", verdictColor: "#6b6889",
    body: <>Lean Anthropic, but figures were fuzzy. Would cross-check before committing.</>,
  },
] as const;

const MODES = [
  { n: "01", title: <>Quick. <em style={{ fontStyle: "italic", color: "#d0bcff", fontWeight: 300 }}>One model.</em></>,            desc: "The cheapest flagship for your prompt. Streams in under two seconds.",                                         stat: <>1.2s · <strong style={{ color: "#e9e6f5", fontWeight: 500 }}>$0.002</strong></> },
  { n: "02", title: <>Super. <em style={{ fontStyle: "italic", color: "#d0bcff", fontWeight: 300 }}>Three in parallel.</em></>,    desc: "Three flagships answer at once. A fourth model picks the best. You see the debate.",                           stat: <>3.4s · <strong style={{ color: "#e9e6f5", fontWeight: 500 }}>$0.009</strong></> },
  { n: "03", title: <>Synthesis. <em style={{ fontStyle: "italic", color: "#d0bcff", fontWeight: 300 }}>With receipts.</em></>,   desc: "Super mode, plus which sentence came from which model. Defend-in-a-meeting mode.",                             stat: <>4.1s · <strong style={{ color: "#e9e6f5", fontWeight: 500 }}>$0.011</strong></> },
] as const;

const RECEIPT_ROWS: [string, string][] = [
  ["GPT-5.1",          "$0.0031"],
  ["Claude 4.5",       "$0.0028"],
  ["Gemini 3.1",       "$0.0019"],
  ["Synthesis (judge)","$0.0016"],
];

export default function LandingPage() {
  const orchestraRef = useRef<HTMLDivElement>(null);
  const streamedRef  = useRef(false);

  useEffect(() => {
    const el = orchestraRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !streamedRef.current) {
        streamedRef.current = true;
        el.querySelectorAll<HTMLElement>("[data-stream]").forEach(streamTokens);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const p = Math.min(1, window.scrollY / (window.innerHeight * 0.8));
      document.querySelectorAll<HTMLElement>(".orchestra-lane").forEach((lane, i) => {
        const base = ([0.6, 0.75, 0.9] as const)[i] ?? 0.6;
        lane.style.setProperty("--p", `${Math.min(1, base + p * 0.1) * 100}%`);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: "#0b1326", color: "#e9e6f5", fontFamily: "'Manrope', 'Segoe UI', sans-serif", WebkitFontSmoothing: "antialiased", overflowX: "hidden", minHeight: "100vh" }}>

      {/* Top vignette */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(208,188,255,.08), transparent 60%)", zIndex: 0 }} aria-hidden />

      {/* ── NAV ── */}
      <nav style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 18 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #d0bcff, #9d87d9)", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#1a0f3a", letterSpacing: 0 }}>NM</div>
          Neural Mob
        </div>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {["Modes", "Proof", "Pricing"].map((label) => (
            <a key={label} href={`#${label.toLowerCase()}`} style={{ color: "#a7a2c2", fontSize: 13, fontWeight: 500, textDecoration: "none" }}>{label}</a>
          ))}
          <Link href="/sign-in" style={{ color: "#e9e6f5", fontSize: 13, fontWeight: 500, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
            Sign in
            <kbd style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 7px", border: "1px solid rgba(208,188,255,.14)", borderRadius: 4, color: "#a7a2c2", background: "rgba(255,255,255,.02)" }}>⌘K</kbd>
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", padding: "40px 0 100px" }}>
        {/* Gridlines */}
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(to right, rgba(208,188,255,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(208,188,255,.06) 1px, transparent 1px)", backgroundSize: "80px 80px", maskImage: "radial-gradient(ellipse at 50% 30%, #000 30%, transparent 80%)" }} />

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 56, alignItems: "center", position: "relative", zIndex: 1 }}>

          {/* Left — headline + CTA */}
          <div>
            <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(60px, 8.6vw, 136px)", lineHeight: 0.9, letterSpacing: "-.035em", margin: "0 0 24px", color: "#e9e6f5", fontVariationSettings: '"opsz" 144' }}>
              Ask <span className="landing-u">once</span>.<br />
              Three minds <span style={{ fontStyle: "italic", fontWeight: 300 }}>answer</span>.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.5, color: "#a7a2c2", maxWidth: 440, margin: "0 0 32px" }}>
              One prompt, sent to{" "}
              <strong style={{ color: "#e9e6f5", fontWeight: 500 }}>GPT-5.1</strong>,{" "}
              <strong style={{ color: "#e9e6f5", fontWeight: 500 }}>Claude 4.5</strong> and{" "}
              <strong style={{ color: "#e9e6f5", fontWeight: 500 }}>Gemini 3.1</strong>{" "}
              in parallel. A fourth model picks the best answer of the three.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <Link href="/sign-in" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 22px", borderRadius: 999, border: "1px solid #d0bcff", background: "#d0bcff", color: "#1a0f3a", fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: 14, textDecoration: "none", transition: "all .2s" }}>
                Sign in free <span>→</span>
              </Link>
              <a href="#proof" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 22px", borderRadius: 999, border: "1px solid rgba(208,188,255,.14)", background: "transparent", color: "#e9e6f5", fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: 14, textDecoration: "none", transition: "all .2s" }}>
                See a run
              </a>
              <span style={{ color: "#6b6889", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: ".04em" }}>$5 starter · no card</span>
            </div>
          </div>

          {/* Right — Orchestra card */}
          <div ref={orchestraRef} style={{ position: "relative", padding: 20, border: "1px solid rgba(208,188,255,.14)", borderRadius: 18, background: "linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)), #0e1830", boxShadow: "0 40px 80px -30px rgba(0,0,0,.6), inset 0 0 0 1px rgba(208,188,255,.04)" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 16 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: ".14em", fontSize: 11, color: "#6b6889" }}>Run · #418,203</span>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 14, fontStyle: "italic", color: "#e9e6f5", opacity: .9 }}>
                <span style={{ color: "#d0bcff" }}>&ldquo;</span>Should I price this seat at $29 or $39?<span style={{ color: "#d0bcff" }}>&rdquo;</span>
              </span>
            </div>

            {/* 3 model lanes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              {LANES.map((lane) => (
                <div
                  key={lane.key}
                  className="orchestra-lane"
                  style={{ border: "1px solid rgba(208,188,255,.06)", borderRadius: 10, padding: 12, minHeight: 150, position: "relative", background: "rgba(255,255,255,.015)", overflow: "hidden", ["--p" as string]: lane.init } as React.CSSProperties}
                >
                  {/* Progress bar */}
                  <div style={{ position: "absolute", top: 0, left: 0, height: 2, background: lane.color, width: "var(--p)", transition: "width .4s", boxShadow: `0 0 10px ${lane.color}` }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: lane.color }}>● {lane.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#6b6889" }}>{lane.ms}</span>
                  </div>
                  <div data-stream style={{ fontSize: 12, lineHeight: 1.55, color: "#a7a2c2", fontFamily: "'JetBrains Mono', monospace" }}>{lane.text}</div>
                </div>
              ))}
            </div>

            {/* Merge rail */}
            <div style={{ height: 28, position: "relative", margin: "6px 0 4px" }}>
              <svg viewBox="0 0 600 28" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
                <path d="M100,0 C100,14 300,14 300,28" stroke="rgba(78,222,163,.7)"   strokeWidth="1" fill="none" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" from="0" to="-12" dur="2s"   repeatCount="indefinite" /></path>
                <path d="M300,0 L300,28"               stroke="rgba(255,138,107,.7)"  strokeWidth="1" fill="none" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" from="0" to="-12" dur="2.3s" repeatCount="indefinite" /></path>
                <path d="M500,0 C500,14 300,14 300,28" stroke="rgba(208,188,255,.7)"  strokeWidth="1" fill="none" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" from="0" to="-12" dur="2.6s" repeatCount="indefinite" /></path>
              </svg>
            </div>

            {/* Synthesis block */}
            <div style={{ border: "1px solid rgba(208,188,255,.14)", borderRadius: 12, padding: "14px 16px", background: "linear-gradient(180deg, rgba(208,188,255,.06), rgba(78,222,163,.03))" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#d0bcff" }}>▲ Synthesis · Claude as judge</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#4edea3" }}>$0.0094 · 4.3s</span>
              </div>
              <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, lineHeight: 1.45, color: "#e9e6f5" }}>
                <span style={{ background: "rgba(78,222,163,.14)", padding: "0 4px", borderRadius: 3 }}>Gemini wins</span>{" "}
                — ditch seats, use a workspace floor. Borrow GPT&apos;s anchor logic if you must charge per-seat. Claude overruled.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODES ── */}
      <section id="modes" style={{ padding: "120px 0 80px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontSize: "clamp(44px,6vw,92px)", lineHeight: .95, letterSpacing: "-.025em", margin: "0 0 56px", maxWidth: 900 }}>
            Three modes.<br />Same three <em style={{ fontStyle: "italic", color: "#d0bcff" }}>minds</em>.
          </h2>
          {MODES.map((row) => (
            <div key={row.n} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", borderTop: "1px solid rgba(208,188,255,.14)", padding: "36px 0", alignItems: "baseline" }}>
              <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#6b6889", width: 32, flexShrink: 0, letterSpacing: ".08em" }}>{row.n}</span>
                <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 400, fontSize: "clamp(28px,3.6vw,48px)", lineHeight: 1.05, letterSpacing: "-.02em", color: "#e9e6f5" }}>{row.title}</div>
              </div>
              <div style={{ paddingLeft: 32, borderLeft: "1px solid rgba(208,188,255,.06)", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24 }}>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "#a7a2c2", margin: 0, maxWidth: 420 }}>{row.desc}</p>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b6889", textAlign: "right", whiteSpace: "nowrap", lineHeight: 1.7 }}>{row.stat}</span>
              </div>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(208,188,255,.14)" }} />
        </div>
      </section>

      {/* ── PROOF ── */}
      <section id="proof" style={{ padding: "100px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px" }}>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontStyle: "italic", fontSize: "clamp(44px,6vw,92px)", lineHeight: .95, letterSpacing: "-.025em", margin: "0 0 40px", maxWidth: 760 }}>
            One prompt.<br />Three <em style={{ color: "#4edea3" }}>different</em> answers.
          </h2>
          <div style={{ border: "1px solid rgba(208,188,255,.14)", borderRadius: 16, background: "#0e1830", overflow: "hidden" }}>
            {/* Question row */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(208,188,255,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 18, fontStyle: "italic", color: "#e9e6f5" }}>
                <span style={{ color: "#d0bcff" }}>&ldquo;</span>In 2023, which had higher revenue: Anthropic or Mistral?<span style={{ color: "#d0bcff" }}>&rdquo;</span>
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", color: "#6b6889", whiteSpace: "nowrap" }}>Real run · 03:41 UTC</span>
            </div>

            {/* 3-cell grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)" }}>
              {PROOF_CELLS.map((cell, i) => (
                <div key={cell.name} style={{ padding: "22px 24px", borderRight: i < 2 ? "1px solid rgba(208,188,255,.06)" : undefined }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: cell.color }}>{cell.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#6b6889" }}>{cell.conf}</span>
                  </div>
                  <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 15, lineHeight: 1.5, color: "#a7a2c2" }}>{cell.body}</div>
                  <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: cell.verdictColor }}>{cell.verdict}</div>
                </div>
              ))}
            </div>

            {/* Synthesis footer */}
            <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(208,188,255,.06)", background: "linear-gradient(180deg,rgba(208,188,255,.04),transparent)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 20, alignItems: "center" }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "#d0bcff" }}>▲ Synthesis</span>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, color: "#e9e6f5" }}>
                <strong style={{ color: "#4edea3" }}>Anthropic, by ~10×.</strong> Flagged Claude&apos;s number as hallucinated.
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#a7a2c2" }}>$0.0094</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 300, fontSize: "clamp(44px,6vw,92px)", lineHeight: .95, letterSpacing: "-.025em", margin: "0 0 16px" }}>
              Pay <em style={{ fontStyle: "italic", color: "#d0bcff" }}>tokens</em>.<br />Not platforms.
            </h2>
            <p style={{ color: "#a7a2c2", fontSize: 16, lineHeight: 1.55, maxWidth: 380, margin: "0 0 28px" }}>
              <strong style={{ color: "#e9e6f5", fontWeight: 500 }}>$5 free</strong> when you sign in. Top up when you want. No subscription. BYOK at zero markup.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/sign-in" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 22px", borderRadius: 999, border: "1px solid #d0bcff", background: "#d0bcff", color: "#1a0f3a", fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
                Claim $5 →
              </Link>
              <Link href="/sign-in" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 22px", borderRadius: 999, border: "1px solid rgba(208,188,255,.14)", background: "transparent", color: "#e9e6f5", fontFamily: "'Manrope', sans-serif", fontWeight: 500, fontSize: 14, textDecoration: "none" }}>
                Use my own keys
              </Link>
            </div>
          </div>

          {/* Receipt */}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, color: "#a7a2c2", background: "repeating-linear-gradient(0deg, transparent 0 26px, rgba(208,188,255,.06) 26px 27px), #0e1830", padding: "24px 28px", border: "1px solid rgba(208,188,255,.14)", borderRadius: 4, boxShadow: "0 40px 60px -30px rgba(0,0,0,.6)", position: "relative" }}>
            <div style={{ textAlign: "center", paddingBottom: 16, borderBottom: "1px dashed rgba(208,188,255,.06)", marginBottom: 12 }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 22, color: "#e9e6f5", display: "block", letterSpacing: "-.01em" }}>Neural Mob</span>
              <span style={{ fontSize: 9.5, color: "#6b6889", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 6, display: "block" }}>Run #418,203 · 2026-04-17</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {RECEIPT_ROWS.map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: "3px 0" }}>{label}</td>
                    <td style={{ padding: "3px 0", textAlign: "right", color: "#e9e6f5" }}>{val}</td>
                  </tr>
                ))}
                <tr><td colSpan={2} style={{ height: 1, padding: 0 }}><div style={{ height: 1, borderTop: "1px dashed rgba(208,188,255,.06)", margin: "6px 0" }} /></td></tr>
                <tr>
                  <td style={{ padding: "3px 0", color: "#d0bcff", fontWeight: 700 }}>Total</td>
                  <td style={{ padding: "3px 0", textAlign: "right", color: "#d0bcff", fontWeight: 700 }}>$0.0094</td>
                </tr>
                <tr>
                  <td style={{ padding: "3px 0", color: "#4edea3" }}>Starter credit</td>
                  <td style={{ padding: "3px 0", textAlign: "right", color: "#4edea3" }}>–$0.0094</td>
                </tr>
                <tr><td colSpan={2} style={{ height: 1, padding: 0 }}><div style={{ height: 1, borderTop: "1px dashed rgba(208,188,255,.06)", margin: "6px 0" }} /></td></tr>
                <tr>
                  <td style={{ padding: "3px 0", color: "#d0bcff", fontWeight: 700 }}>You paid</td>
                  <td style={{ padding: "3px 0", textAlign: "right", color: "#d0bcff", fontWeight: 700 }}>$0.00</td>
                </tr>
              </tbody>
            </table>
            <div style={{ textAlign: "center", paddingTop: 10, borderTop: "1px dashed rgba(208,188,255,.06)", marginTop: 10 }}>
              <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#e9e6f5", display: "block" }}>We&apos;d rather bill a cent than a subscription.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "56px 40px 36px", borderTop: "1px solid rgba(208,188,255,.14)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontSize: 18 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #d0bcff, #9d87d9)", display: "grid", placeItems: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#1a0f3a" }}>NM</div>
            Neural Mob
          </div>
          <p style={{ color: "#6b6889", fontSize: 13, lineHeight: 1.55, maxWidth: 360, margin: "14px 0 0" }}>
            One person. One weekend that became many. One model is a guess; three is a decision.
          </p>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#6b6889", letterSpacing: ".06em", textTransform: "uppercase", textAlign: "right", lineHeight: 1.7 }}>
          <div>v0.4.2 · <span style={{ color: "#4edea3" }}>● healthy</span></div>
          <div style={{ marginTop: 4 }}>
            <a href="https://github.com/boozinix/multi-llm-orchestrator" target="_blank" rel="noopener noreferrer" style={{ color: "#a7a2c2", textDecoration: "underline", textDecorationColor: "rgba(208,188,255,.14)", textUnderlineOffset: 3 }}>GitHub</a>
            {" · "}
            <a href="mailto:zubair.nizami@yahoo.com" style={{ color: "#a7a2c2", textDecoration: "underline", textDecorationColor: "rgba(208,188,255,.14)", textUnderlineOffset: 3 }}>Email</a>
          </div>
          <div>© 2026</div>
        </div>
      </footer>
    </div>
  );
}
