import type { CompanyBrainAnswer, HealthResponse } from "@/types/companyBrain";

const REQUEST_TIMEOUT_MS = 120_000;

export function backendBaseUrl(): string {
  const baseUrl = process.env.COMPANY_BRAIN_API_URL;
  if (!baseUrl) {
    throw new Error("COMPANY_BRAIN_API_URL is not configured.");
  }
  return baseUrl.replace(/\/$/, "");
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function queryCompanyBrain(
  question: string,
): Promise<CompanyBrainAnswer> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return (await response.json()) as CompanyBrainAnswer;
}

export async function getCompanyBrainHealth(): Promise<HealthResponse> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/health`, {
    method: "GET",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return (await response.json()) as HealthResponse;
}

export async function ingestCompanyBrainFile(formData: FormData): Promise<unknown> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return response.json();
}
