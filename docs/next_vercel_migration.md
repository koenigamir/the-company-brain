# Next.js / Vercel Migration Plan

The backend is already separated from Streamlit. The migration is now a frontend replacement: build the Next.js app against the same FastAPI API instead of rewriting GraphRAG.

## Current Backend Contract

- `GET /health`
- `POST /query` with `{"question": "...", "history": []}`
- `POST /ingest` with multipart `file` and optional `role_owner`
- `GET /roles`
- `GET /documents`
- `POST /gap-ticket`

Answers return the existing GraphRAG shape:

```text
title
short_answer
detailed_answer
confidence
used_llm_knowledge
sources
role_owner
last_updated_dates
graph
gap_routing
missing_topics
gap_ticket_draft
```

## Target Vercel Structure

```text
frontend-next/
  app/
    api/company-brain/*
    page.tsx
  lib/companyBrain.ts
  types/companyBrain.ts
```

The browser calls Next.js API routes. Next.js server routes call the AWS backend using `COMPANY_BRAIN_API_URL`.

## Migration Steps

1. Rebuild the Streamlit query surface in `frontend-next/app/page.tsx`.
2. Preserve the existing answer display contract: confidence, sources, owner, dates, graph debug panel, general-knowledge flag, missing topics, and gap routing.
3. Add upload/ingest for documents, images, audio, and video once query is stable.
4. Deploy to Vercel with project root `frontend-next`.
5. Point Vercel env var `COMPANY_BRAIN_API_URL` at the AWS backend.
6. Replace the direct ECS public IP with ALB + HTTPS before sharing outside the team.

## Non-Negotiables

- Do not put Anthropic or AWS keys in the frontend.
- Do not call Anthropic directly from Vercel.
- Do not expose `ANTHROPIC_API_KEY` or AWS credentials through `NEXT_PUBLIC_*`.
- Keep the backend scaled to `0` when nobody is testing.
