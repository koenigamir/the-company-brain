import type {
  CompanyBrainAnswer,
  CompanyBrainIngestResult,
  DocumentsResponse,
  GapTicketRequest,
  GapTicketResponse,
  HealthResponse,
  QueryRequest,
  RolesResponse,
} from "@/types/companyBrain";

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
  history: Array<Record<string, string>> = [],
): Promise<CompanyBrainAnswer> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, history }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return (await response.json()) as CompanyBrainAnswer;
}

export async function queryCompanyBrainWithPayload(
  payload: QueryRequest,
): Promise<CompanyBrainAnswer> {
  return queryCompanyBrain(payload.question, payload.history || []);
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

export async function ingestCompanyBrainFile(
  formData: FormData,
): Promise<CompanyBrainIngestResult> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return (await response.json()) as CompanyBrainIngestResult;
}

export async function getCompanyBrainRoles(): Promise<RolesResponse> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/roles`, {
    method: "GET",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return (await response.json()) as RolesResponse;
}

export async function getCompanyBrainDocuments(): Promise<DocumentsResponse> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/documents`, {
    method: "GET",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return (await response.json()) as DocumentsResponse;
}

export async function createCompanyBrainGapTicket(
  payload: GapTicketRequest,
): Promise<GapTicketResponse> {
  const response = await fetchWithTimeout(`${backendBaseUrl()}/gap-ticket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend returned ${response.status}.`);
  }

  return (await response.json()) as GapTicketResponse;
}
