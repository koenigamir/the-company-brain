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
http://18.197.151.233:8000
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
COMPANY_BRAIN_API_URL=http://18.197.151.233:8000
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
COMPANY_BRAIN_API_URL=http://18.197.151.233:8000
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

`GET /demo-accounts` returns:

```ts
{
  accounts: Array<{
    id: string;
    label: string;
    department_role: string | null;
    clearance: "intern" | "standard" | "senior" | string;
    global_access: boolean;
  }>;
  backend: "local" | "supabase" | string;
}
```

`GET /documents` returns:

```ts
{
  documents: Array<{
    source_file: string;
    role_owner: string;
    role_owners: string[];
    visibility_roles: string[];
    min_clearance: "intern" | "standard" | "senior" | string;
    last_updated?: string;
    updated_at?: string;
    chunks?: number;
    modality?: string;
  }>;
}
```

`POST /query` accepts:

```ts
{
  question: string;
  history?: Array<Record<string, string>>;
  viewer_account_id?: string;
}
```

It returns `CompanyBrainAnswer` from `types/companyBrain.ts`, plus newly deployed access fields:

```ts
{
  viewer_account?: {
    id: string;
    label: string;
    department_role: string | null;
    clearance: "intern" | "standard" | "senior" | string;
    global_access: boolean;
  };
  access_notice?: string | null;
  restricted_source_count?: number;
}
```

`detailed_answer` is still a single string, but the backend now normalizes it to simple Markdown-safe text:

- short paragraphs
- `-` bullets
- optional `**bold**`
- no tables
- no heading markers intended for rendering
- no LaTeX math delimiters
- no fenced code blocks

`POST /ingest` accepts multipart form data:

```text
file=<document/image/audio/video>
role_owner=<optional role name>
visibility_roles=<optional repeated role name or ALL>
min_clearance=<optional intern|standard|senior>
```

`POST /gap-ticket` accepts:

```ts
{
  question: string;
  gap: Record<string, unknown>;
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

## Backend Changes Deployed On 2026-05-31

The backend contract changed after the original frontend handoff:

- Demo accounts are now backend-seeded and available through `GET /demo-accounts`.
- Query requests can now carry `viewer_account_id`.
- Query responses now include `viewer_account`, `access_notice`, and `restricted_source_count`.
- Document records now expose `visibility_roles` and `min_clearance`.
- Upload ingest now accepts optional access metadata.
- The long-answer field is cleaner for frontend display and no longer emits table/LaTeX-heavy formatting.

The checked-in frontend now consumes those additions through the local Next proxy routes:

- Query loads backend-seeded demo accounts, sends `viewer_account_id`, and shows access notices plus restricted-source metadata.
- Welcome shows live role counts per team together with document visibility and clearance metadata from `/documents`.
- Upload exposes optional `visibility_roles` and `min_clearance` controls and reflects the returned access metadata after ingest.

Read [FRONTEND_AGENT_HANDOFF_2026-05-31.md](/private/tmp/the-company-brain-push-2/frontend-next/FRONTEND_AGENT_HANDOFF_2026-05-31.md) for the rollout history and backend contract details.
