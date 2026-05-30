import { NextResponse } from "next/server";

import { getCompanyBrainHealth } from "@/lib/companyBrain";

export const maxDuration = 60;

export async function GET() {
  try {
    const health = await getCompanyBrainHealth();
    return NextResponse.json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
