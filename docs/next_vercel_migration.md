# Next.js / Vercel Migration Handoff

The backend is separated from Streamlit and deployed on ECS Fargate. The Next.js migration is now a frontend replacement: build the Vercel app against the FastAPI API instead of rewriting GraphRAG.

As of 2026-05-31, the live migrated backend URL is:

```text
http://63.176.100.250:8000
```

That is an ECS task public IP and can change after a backend restart. Use `./scripts/aws_backend.sh url` from the repo root to get the current URL.

## Current Backend Contract

- `GET /health`
- `POST /query` with `{"question": "...", "history": []}`
- `POST /ingest` with multipart `file` and optional `role_owner`
- `GET /roles`
- `GET /documents`
- `POST /gap-ticket`

Answers return the migrated GraphRAG shape:

```text
title
short_answer
detailed_answer
confidence
used_llm_knowledge
sources
role_owner
gap_required
missing_topics
gap_ticket_draft
last_updated_dates
graph
gap_routing
```

## Target Vercel Structure

```text
frontend-next/
  app/
    api/company-brain/*
    page.tsx
  lib/companyBrain.ts
  types/companyBrain.ts
  README.md
```

The browser calls Next.js API routes. Next.js server routes call the AWS backend using `COMPANY_BRAIN_API_URL`.

## What Is Already Implemented

- Proxy routes for health, roles, documents, query, ingest, and gap-ticket.
- Shared TypeScript types for the migrated backend response shapes.
- A functional developer workspace in `app/page.tsx`.
- Upload support for documents, images, audio, and video through the backend.
- Gap ticket creation through the backend.
- `frontend-next/README.md` with exact setup and handoff notes.

## Frontend Developer Tasks

1. Keep the API proxy layer unchanged unless the backend contract changes.
2. Turn the developer workspace into the final Seven product UI.
3. Preserve answer rendering for short answer, detailed answer, sources, owner, dates, graph metadata, and gap routing.
4. Add product-grade navigation and state management only after the backend contract is stable.
5. Deploy to Vercel with project root `frontend-next`.
6. Set Vercel env var `COMPANY_BRAIN_API_URL` to the current backend URL.
7. Replace the direct ECS public IP with ALB + HTTPS before sharing outside the controlled demo group.

## Local Frontend Commands

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

## Non-Negotiables

- Do not put Anthropic or AWS keys in the frontend.
- Do not call Anthropic directly from Vercel.
- Do not expose `ANTHROPIC_API_KEY` or AWS credentials through `NEXT_PUBLIC_*`.
- Do not call the AWS backend directly from browser components; use `/api/company-brain/*`.
- Keep the backend scaled to `0` when nobody is testing.
