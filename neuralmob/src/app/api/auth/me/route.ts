import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth";
import { getLocalOwnerEmail, isLocalOwnerBypassEnabled } from "@/lib/server/auth-mode";

export async function GET() {
  if (isLocalOwnerBypassEnabled()) {
    return NextResponse.json({
      authenticated: true,
      email: getLocalOwnerEmail(),
      provider: "local_owner",
    });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ authenticated: false, email: null });
  }
  const user = await currentUser();
  const raw = user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
  if (!raw || !isValidEmail(raw)) {
    return NextResponse.json({ authenticated: true, email: null });
  }
  return NextResponse.json({ authenticated: true, email: normalizeEmail(raw), provider: "clerk" });
}
