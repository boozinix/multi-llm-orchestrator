import type { Metadata, Viewport } from "next";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { getLocalOwnerEmail, isLocalOwnerBypassEnabled } from "@/lib/server/auth-mode";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1326",
};

export const metadata: Metadata = {
  title: "Neural Mob",
  description: "Multi-model orchestration with streaming synthesis, credits, and secure sign-in",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const localOwnerBypass = isLocalOwnerBypassEnabled();
  const localOwnerEmail = localOwnerBypass ? getLocalOwnerEmail() : null;

  return (
    <html lang="en" className="dark">
      <body className="antialiased app-shell">
        <ClerkProvider
          signInFallbackRedirectUrl="/workspace"
          signUpFallbackRedirectUrl="/workspace"
          afterSignOutUrl="/workspace"
        >
          <header className="fixed top-0 right-0 z-[200] flex items-center gap-2 px-3 py-2 safe-top">
            {localOwnerBypass ? (
              <div className="app-panel-soft rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#d0bcff] backdrop-blur-xl">
                Local owner mode: {localOwnerEmail}
              </div>
            ) : (
              <>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="app-panel-soft rounded-full px-3.5 py-2 text-xs font-semibold text-[#d0bcff] hover:text-white backdrop-blur-xl"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="rounded-full px-3.5 py-2 text-xs font-semibold text-[#340080] border border-[#d0bcff]/25 shadow-[0_10px_30px_rgba(160,120,255,0.22)]"
                  style={{ background: "linear-gradient(135deg, #d0bcff 0%, #a078ff 100%)" }}
                >
                  Sign up
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: { userButtonAvatarBox: "w-9 h-9" },
                }}
              />
            </Show>
              </>
            )}
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
