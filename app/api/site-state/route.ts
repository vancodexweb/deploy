import { NextResponse } from "next/server";
import { readSiteState } from "@/lib/siteState";
import { withServerTime } from "@/lib/sitePayload";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readSiteState();
  return NextResponse.json(withServerTime(state));
}
