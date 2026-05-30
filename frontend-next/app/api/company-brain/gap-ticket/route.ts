import { NextResponse } from "next/server";

import { createCompanyBrainGapTicket } from "@/lib/companyBrain";
import type { GapTicketRequest } from "@/types/companyBrain";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GapTicketRequest>;
    const question = body.question?.trim();
    const gap =
      body.gap && typeof body.gap === "object" && !Array.isArray(body.gap)
        ? body.gap
        : null;

    if (!question || !gap) {
      return NextResponse.json(
        { error: "Question and gap are required." },
        { status: 400 },
      );
    }

    const ticket = await createCompanyBrainGapTicket({
      question,
      gap,
      body: body.body?.trim() || "Knowledge gap review requested.",
      missing_topics: body.missing_topics || [],
    });
    return NextResponse.json(ticket);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gap ticket creation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
