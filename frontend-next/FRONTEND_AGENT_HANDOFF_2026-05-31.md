# Frontend Agent Handoff - 2026-05-31

This note explains the backend changes that were deployed on May 31, 2026 and what the next frontend agent should do in `frontend-next/`.

## Live Backend

As of 2026-05-31, the live AWS backend is:

```text
http://18.197.151.233:8000
```

This is still a direct ECS task public IP. It can change after any restart or redeploy. Keep it only in server-side env vars:

```text
COMPANY_BRAIN_API_URL=http://18.197.151.233:8000
```

Do not expose it in browser code.

## What Changed In The Backend

The backend now supports demo-account-aware access control and cleaner long-answer output.

### New route

- `GET /demo-accounts`

It returns 9 preset demo accounts:

- `intern-general`
- `standard-employee`
- `senior-leader`
- `esg-compliance-senior`
- `master-data-ops-senior`
- `tax-team-senior`
- `regulatory-services-senior`
- `product-coverage-onboarding-senior`
- `compliance-sanctions-senior`

### Query request change

`POST /query` now accepts:

```ts
{
  question: string;
  history?: Array<Record<string, string>>;
  viewer_account_id?: string;
}
```

If `viewer_account_id` is omitted, the backend defaults to `standard-employee`.

### Query response change

The existing answer shape is still there, but these additive fields now exist:

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

Meaning:

- `viewer_account` tells the UI which demo account the backend actually used.
- `access_notice` explains when relevant company information was hidden by access control.
- `restricted_source_count` tells the UI how many relevant sources were excluded.

### Documents metadata change

`GET /documents` now returns access metadata per document:

```ts
{
  source_file: string;
  role_owner: string;
  role_owners: string[];
  visibility_roles: string[];
  min_clearance: "intern" | "standard" | "senior" | string;
  last_updated?: string;
  updated_at?: string;
  chunks?: number;
  modality?: string;
}
```

The live server was also backfilled after deploy, so `/documents` now reflects the indexed corpus instead of only a single stale record. At deploy time it returned `23` document rows.

### Ingest request change

`POST /ingest` now also accepts:

```text
visibility_roles=<repeated form field>
min_clearance=<intern|standard|senior>
```

These are optional. If the UI omits them, the backend still works.

### Long-answer cleanup

`detailed_answer` is still a single string, but the backend now normalizes it to a simpler format:

- short paragraphs
- `-` bullets
- optional `**bold**`
- no table layout
- no LaTeX delimiters
- no fenced code blocks

This makes it safer to render directly or with a very small Markdown subset.

## What Is Live Right Now

The deployed backend was verified after rollout:

- `GET /health` returned `200`
- `GET /demo-accounts` returned the 9 seeded accounts
- `POST /query` accepted `viewer_account_id`
- `GET /documents` returned the backfilled document set with `visibility_roles` and `min_clearance`

Observed live behavior:

- `intern-general` gets restricted-answer notices on queries that hit senior-only material
- `standard-employee` can get a normal answer plus an `access_notice` when some relevant sources were hidden
- `senior-leader` can see the uncensored company-grounded answer set

## Frontend Work Still Needed

The checked-in frontend code predates these backend additions. The next frontend agent should update these areas:

### 1. Add a demo account selector

Suggested files:

- `frontend-next/lib/companyBrain.ts`
- `frontend-next/types/companyBrain.ts`
- `frontend-next/app/query/page.tsx`
- `frontend-next/app/welcome/page.tsx`

Work:

- Add a helper for `GET /demo-accounts`
- Add a local Next proxy route under `app/api/company-brain/demo-accounts/route.ts`
- Load demo accounts in the query flow
- Let the user choose one active demo account
- Persist the selection in local UI state first; no backend persistence is required

### 2. Send `viewer_account_id` on queries

Suggested files:

- `frontend-next/types/companyBrain.ts`
- `frontend-next/lib/companyBrain.ts`
- `frontend-next/app/api/company-brain/query/route.ts`
- `frontend-next/app/query/page.tsx`

Work:

- Extend `QueryRequest`
- Pass `viewer_account_id` from the browser form to the Next proxy route
- Forward it from the proxy route to the backend

### 3. Surface access-control response fields

Suggested files:

- `frontend-next/types/companyBrain.ts`
- `frontend-next/components/query-answer-panel.tsx`
- `frontend-next/lib/companyBrainPresentation.ts`

Work:

- Extend `CompanyBrainAnswer` with `viewer_account`, `access_notice`, and `restricted_source_count`
- Show `access_notice` prominently when present
- Consider a small badge or metadata tile for the active viewer account
- Consider showing `restricted_source_count` in the expanded metadata area

### 4. Update document presentation

Suggested files:

- `frontend-next/types/companyBrain.ts`
- `frontend-next/lib/companyBrainPresentation.ts`
- `frontend-next/app/welcome/page.tsx`

Work:

- Add `visibility_roles` and `min_clearance` to `CompanyBrainDocument`
- Show access metadata on document cards or in the welcome view
- Make it clear which documents are general versus senior-only or department-scoped

### 5. Optional upload controls

Suggested files:

- `frontend-next/app/upload/page.tsx`
- `frontend-next/types/companyBrain.ts`

Work:

- Keep current upload working as-is
- Optionally add UI controls for `visibility_roles` and `min_clearance`
- If you add them, send them as multipart form fields through the existing proxy path

## Important Current Mismatch

As of this handoff, the backend is deployed, but the frontend code still reflects the older contract:

- there is no `demo-accounts` proxy route yet
- `QueryRequest` does not include `viewer_account_id`
- `CompanyBrainAnswer` does not include the new access-control fields
- `CompanyBrainDocument` does not model `visibility_roles` or `min_clearance`
- the query UI does not yet let the user switch demo accounts

So the backend work is live, but the frontend has not yet been wired up to use it.

## Safe Integration Order

1. Update types in `types/companyBrain.ts`
2. Add `demo-accounts` fetch helper and Next proxy route
3. Add the query-side demo account picker
4. Forward `viewer_account_id` through the query proxy
5. Render `access_notice` and `restricted_source_count`
6. Expand document cards to show access metadata
7. Decide whether upload access fields are needed for the demo

## Keep These Rules

- Browser code should still call only `/api/company-brain/*`
- Keep `COMPANY_BRAIN_API_URL` server-side only
- Do not hardcode the ECS IP into browser components
- Expect the backend IP to change again after future restarts unless an ALB or stable DNS is added
