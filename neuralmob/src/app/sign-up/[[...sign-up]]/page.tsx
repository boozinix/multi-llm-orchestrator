import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isLocalOwnerBypassEnabled } from "@/lib/server/auth-mode";

export default function SignUpPage() {
  if (isLocalOwnerBypassEnabled()) {
    redirect("/workspace");
  }

  return (
    <main className="min-h-[100dvh] bg-[#0b1326] text-[#dae2fd] flex items-center justify-center p-6 app-shell">
      <div className="ambient-orb orbit-slow left-[10%] top-[12%] h-56 w-56 bg-[#8a68ff]/20" />
      <div className="ambient-orb orbit-slow right-[10%] bottom-[10%] h-52 w-52 bg-[#4edea3]/10" />
      <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-[1fr_430px] items-center">
        <section className="hidden lg:block">
          <p className="app-eyebrow mb-4">Join Neural Mob</p>
          <h1 className="app-hero-title text-6xl text-[#edf2ff] max-w-3xl">Start with cheap models, then unlock the full studio.</h1>
          <p className="mt-5 max-w-xl text-lg text-[#b5c0d8] leading-8">
            New accounts begin with starter credit on low-cost models. Top up when you want the full catalog, deeper orchestration, and uninterrupted runs.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">$0.50 starter credit</span>
            <span className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Strict billing guardrails</span>
            <span className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Fast onboarding</span>
          </div>
        </section>
        <div className="app-panel rounded-[2rem] p-4 sm:p-6">
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            forceRedirectUrl="/workspace"
            fallbackRedirectUrl="/workspace"
          />
        </div>
      </div>
    </main>
  );
}
