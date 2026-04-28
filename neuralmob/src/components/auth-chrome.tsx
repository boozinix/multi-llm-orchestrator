"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

type AuthChromeProps = {
  localOwnerBypass: boolean;
  localOwnerEmail: string | null;
};

const HIDDEN_PATH_PREFIXES = ["/workspace", "/settings", "/admin", "/sign-in", "/sign-up", "/login"];

export function AuthChrome({ localOwnerBypass, localOwnerEmail }: AuthChromeProps) {
  const pathname = usePathname();

  // Landing page has its own nav with sign-in link — no need for the overlay chrome.
  if (pathname === "/") return null;

  if (pathname && HIDDEN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return null;
  }

  return (
    <header className="fixed top-0 right-0 z-[200] flex max-w-[calc(100vw-1rem)] flex-wrap items-center justify-end gap-2 px-3 py-2 safe-top sm:max-w-none">
      {localOwnerBypass ? (
        <div className="app-panel-soft rounded-full px-3 py-1.5 text-[11px] font-semibold text-[#d0bcff] backdrop-blur-xl max-w-full truncate">
          Local owner mode: {localOwnerEmail}
        </div>
      ) : (
        <>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                type="button"
                className="min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold text-[#d0bcff] hover:text-white backdrop-blur-xl app-panel-soft"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="min-h-10 rounded-full px-3.5 py-2 text-xs font-semibold text-[#340080] border border-[#d0bcff]/25 shadow-[0_10px_30px_rgba(160,120,255,0.22)]"
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
  );
}
