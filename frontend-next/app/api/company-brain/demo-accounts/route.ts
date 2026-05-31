import { NextResponse } from "next/server";

import { getCompanyBrainDemoAccounts } from "@/lib/companyBrain";

export const maxDuration = 60;

export async function GET() {
  try {
    const accounts = await getCompanyBrainDemoAccounts();
    return NextResponse.json(accounts);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Demo accounts lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
