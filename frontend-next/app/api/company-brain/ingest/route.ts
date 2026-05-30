import { NextResponse } from "next/server";

import { ingestCompanyBrainFile } from "@/lib/companyBrain";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    if (!formData.get("file")) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    const result = await ingestCompanyBrainFile(formData);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
