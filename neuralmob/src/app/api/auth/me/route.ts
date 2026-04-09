import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isValidEmail, normalizeEmail } from "@/lib/auth";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ authenticated: false, email: null });
  }
  const user = await currentUser();
  const raw = user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
  if (!raw || !isValidEmail(raw)) {
    return NextResponse.json({ authenticated: true, email: null });
  }
  return NextResponse.json({ authenticated: true, email: normalizeEmail(raw) });
}
