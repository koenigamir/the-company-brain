import { NextResponse } from "next/server";

import { getCompanyBrainRoles } from "@/lib/companyBrain";

export const maxDuration = 60;

export async function GET() {
  try {
    const roles = await getCompanyBrainRoles();
    return NextResponse.json(roles);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Roles lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
