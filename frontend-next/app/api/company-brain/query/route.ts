import { NextResponse } from "next/server";

import { queryCompanyBrain } from "@/lib/companyBrain";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: string };
    const question = body.question?.trim();
    if (!question) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 },
      );
    }

    const answer = await queryCompanyBrain(question);
    return NextResponse.json(answer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
