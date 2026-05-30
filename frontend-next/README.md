# Company Brain Next Frontend

This folder is the clean Vercel/Next.js handoff for the migrated GraphRAG backend.

The browser must call only these local Next routes:

```text
/api/company-brain/health
/api/company-brain/roles
/api/company-brain/documents
/api/company-brain/query
/api/company-brain/ingest
/api/company-brain/gap-ticket
```

Those routes run on the Next.js server and proxy to the FastAPI backend configured by `COMPANY_BRAIN_API_URL`.

## Current Live Backend

As of 2026-05-31, the migrated AWS backend is live at:

```text
http://63.176.100.250:8000
```

The IP is an ECS task public IP and can change after a restart or redeploy. For local work, copy `.env.local.example` to `.env.local` and set the current backend URL there.

## Local Setup

```bash
cd frontend-next
nvm use
npm install
cp .env.local.example .env.local
npm run dev
```

Set `.env.local`:

```text
COMPANY_BRAIN_API_URL=http://63.176.100.250:8000
```

Open:

```text
http://localhost:3000
```

## Vercel Setup

- Project root: `frontend-next`
- Framework preset: Next.js
- Node version: 22
- Server-side environment variable:

```text
COMPANY_BRAIN_API_URL=http://63.176.100.250:8000
```

Do not use `NEXT_PUBLIC_COMPANY_BRAIN_API_URL`. The backend URL belongs on the server side, not in browser code.

## Backend Contract

`GET /health` returns artifact status:

```ts
{
  ok: boolean;
  data_dir: string;
  chroma_dir: string;
  graph_path: string;
  store_dir: string;
  data_dir_exists: boolean;
  chroma_dir_exists: boolean;
  graph_exists: boolean;
  store_dir_exists: boolean;
  collection_name: string;
}
```

`GET /roles` returns:

```ts
{
  roles: string[];
  backend: "local" | "supabase" | string;
}
```

`GET /documents` returns:

```ts
{
  documents: Array<Record<string, unknown>>;
}
```

`POST /query` accepts:

```ts
{
  question: string;
  history?: Array<Record<string, string>>;
}
```

It returns `CompanyBrainAnswer` from `types/companyBrain.ts`, including `short_answer`, `detailed_answer`, `sources`, `role_owner`, `gap_required`, `missing_topics`, `gap_ticket_draft`, and graph debug metadata.

`POST /ingest` accepts multipart form data:

```text
file=<document/image/audio/video>
role_owner=<optional role name>
```

`POST /gap-ticket` accepts:

```ts
{
  question: string;
  gap: string;
  body?: string;
  missing_topics?: string[];
}
```

## Developer Rules

- Keep all backend calls inside `app/api/company-brain/*`.
- Keep shared response/request types in `types/companyBrain.ts`.
- Keep server-only backend helpers in `lib/companyBrain.ts`.
- Do not add Anthropic, AWS, Supabase, or other secrets to frontend code.
- Do not commit `.env.local`, `.next/`, `node_modules/`, or `tsconfig.tsbuildinfo`.
- Run `npm run typecheck` and `npm run build` before handing off frontend changes.

## Current UI Scope

The checked-in UI is a functional developer workspace, not the final product design. It intentionally exposes:

- an intro splash at `/` plus a richer welcome page at `/welcome`,
- backend health and persistence status,
- role catalog,
- document metadata records,
- query and answer rendering,
- GraphRAG debug metadata,
- upload/ingest,
- gap ticket creation.

Frontend developers should build the polished product UI on top of this contract without bypassing the proxy routes.
