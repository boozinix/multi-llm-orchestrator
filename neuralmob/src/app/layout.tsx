import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AuthChrome } from "@/components/auth-chrome";
import { getLocalOwnerEmail, isLocalOwnerBypassEnabled } from "@/lib/server/auth-mode";
import "./globals.css";

const appDescription =
  "Neural Mob orchestrates multiple AI models with independent reasoning, live streaming, and synthesis in one workspace.";

const metadataBase = (() => {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3010";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3010");
  }
})();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1326",
};

export const metadata: Metadata = {
  metadataBase,
  title: "Neural Mob",
  description: appDescription,
  applicationName: "Neural Mob",
  keywords: ["Neural Mob", "AI orchestration", "multi-model", "LLM workflow", "AI synthesis"],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Neural Mob",
    description: appDescription,
    siteName: "Neural Mob",
    type: "website",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Neural Mob",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Neural Mob",
    description: appDescription,
    images: ["/twitter-image"],
  },
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
          <AuthChrome localOwnerBypass={localOwnerBypass} localOwnerEmail={localOwnerEmail} />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
