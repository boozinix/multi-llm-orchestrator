import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAllowedRequestOrigin } from "@/lib/server/request-origin";

const MAX_API_BODY_BYTES = 512 * 1024;

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/settings(.*)",
  "/api/conversations(.*)",
  "/api/chat(.*)",
  "/api/billing(.*)",
  "/api/usage(.*)",
  "/api/auth/logout(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  const isStripeWebhook = pathname === "/api/stripe/webhook";

  if (
    !isStripeWebhook &&
    pathname.startsWith("/api/") &&
    (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")
  ) {
    if (!isAllowedRequestOrigin(req)) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }
    const raw = req.headers.get("content-length");
    if (raw) {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > MAX_API_BODY_BYTES) {
        return NextResponse.json({ error: "Request body too large" }, { status: 413 });
      }
    }
  }

  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
