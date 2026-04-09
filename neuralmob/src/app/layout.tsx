import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1326",
};

export const metadata: Metadata = {
  title: "MultiBot Orchestrator",
  description: "Orchestrate multiple LLMs in parallel with intelligent synthesis",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ClerkProvider
          signInFallbackRedirectUrl="/workspace"
          signUpFallbackRedirectUrl="/workspace"
          afterSignOutUrl="/workspace"
        >
          <header className="fixed top-0 right-0 z-[200] flex items-center gap-2 px-3 py-2 safe-top">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="rounded-lg bg-[#222a3d] px-3 py-1.5 text-xs font-semibold text-[#d0bcff] border border-[#494454]/40 hover:bg-[#2d3449]"
                >
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#340080] border border-[#d0bcff]/30"
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
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
