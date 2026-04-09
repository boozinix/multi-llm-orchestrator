import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { isLocalOwnerBypassEnabled } from "@/lib/server/auth-mode";

export default function SignInPage() {
  if (isLocalOwnerBypassEnabled()) {
    redirect("/workspace");
  }

  return (
    <main className="min-h-[100dvh] bg-[#0b1326] text-[#dae2fd] flex items-center justify-center p-6 app-shell">
      <div className="ambient-orb orbit-slow left-[8%] top-[10%] h-56 w-56 bg-[#8a68ff]/20" />
      <div className="ambient-orb orbit-slow right-[12%] bottom-[12%] h-52 w-52 bg-[#4edea3]/10" />
      <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-[1fr_430px] items-center">
        <section className="hidden lg:block">
          <p className="app-eyebrow mb-4">Welcome Back</p>
          <h1 className="app-hero-title text-6xl text-[#edf2ff] max-w-3xl">A reasoning studio, not just another chat box.</h1>
          <p className="mt-5 max-w-xl text-lg text-[#b5c0d8] leading-8">
            Neural Mob lets you route prompts through multiple models, watch each phase stream live, and end with a synthesized answer that feels deliberate.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Multi-model orchestration</span>
            <span className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Streaming merges</span>
            <span className="app-panel-soft rounded-full px-4 py-2 text-sm text-[#edf2ff]">Metered hosted access</span>
          </div>
        </section>
        <div className="app-panel rounded-[2rem] p-4 sm:p-6">
          <SignIn
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            forceRedirectUrl="/workspace"
            fallbackRedirectUrl="/workspace"
          />
        </div>
      </div>
    </main>
  );
}
