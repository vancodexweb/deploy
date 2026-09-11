import { NextResponse } from "next/server";
import { readLaunchState } from "@/lib/launchState";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readLaunchState();
  return NextResponse.json(state);
}
