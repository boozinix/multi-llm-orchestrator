import { NextResponse } from "next/server";
import { isShowcaseMode } from "@/lib/server/showcase";

/** Lets the client show a banner and disable chat without exposing secrets. */
export async function GET() {
  return NextResponse.json({ showcase: isShowcaseMode() });
}
