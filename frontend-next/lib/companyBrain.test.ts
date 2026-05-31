import assert from "node:assert/strict";
import test from "node:test";

import { queryCompanyBrainWithPayload } from "./companyBrain";

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.COMPANY_BRAIN_API_URL;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) {
    delete process.env.COMPANY_BRAIN_API_URL;
  } else {
    process.env.COMPANY_BRAIN_API_URL = originalApiUrl;
  }
});

test("queryCompanyBrainWithPayload forwards viewer account access context", async () => {
  process.env.COMPANY_BRAIN_API_URL = "http://backend.test";

  let capturedUrl = "";
  let capturedBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

    return new Response(
      JSON.stringify({
        title: "Coverage answer",
        short_answer: "Use the regulatory workflow.",
        confidence: "High",
        sources: ["coverage.pdf"],
        role_owner: "Regulatory Services",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }) as typeof fetch;

  await queryCompanyBrainWithPayload({
    question: "Which workflow should I use?",
    history: [{ role: "user", content: "Earlier question" }],
    viewer_account_id: "intern-general",
  });

  assert.equal(capturedUrl, "http://backend.test/query");
  assert.deepEqual(capturedBody, {
    question: "Which workflow should I use?",
    history: [{ role: "user", content: "Earlier question" }],
    viewer_account_id: "intern-general",
  });
});
