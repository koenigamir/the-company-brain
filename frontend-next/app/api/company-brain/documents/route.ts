import { NextResponse } from "next/server";

import { getCompanyBrainDocuments } from "@/lib/companyBrain";

export const maxDuration = 60;

export async function GET() {
  try {
    const documents = await getCompanyBrainDocuments();
    return NextResponse.json(documents);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Document lookup failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
