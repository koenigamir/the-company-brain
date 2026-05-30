# Seven Frontend Design

**Date:** 2026-05-30

## Goal

Replace the placeholder `frontend-next` starter UI with a user-facing product called **Seven** that runs on Vercel/Next.js and connects to the existing FastAPI backend through the current Next API proxy routes.

## Approved Scope

- A welcome page at `/` that explains the product and guides users into the app.
- A dedicated query page at `/query`.
- A dedicated upload page at `/upload`.
- Upload is presented as a normal product page, not an admin-only tool.

## Product Shape

### Welcome Page

- Introduce Seven as the knowledge interface for regulatory, tax, ESG, and reference-data workflows.
- Explain that answers are grounded in indexed company knowledge, include sources, and can surface routing when the system lacks verified coverage.
- Use a scroll-friendly landing layout with a clear call to action that leads users to the query page.
- Include a secondary call to action to the upload page.

### Query Page

- Provide the main prompt-first search experience.
- Keep sample questions visible for fast onboarding.
- Show all backend answer fields already available today:
  - `title`
  - `summary`
  - `confidence`
  - `sources`
  - `role_owner`
  - `last_updated_dates`
  - `graph`
  - `gap_routing`
- Surface the difference between vector-only results and graph-expanded results.
- When confidence is low, present the routing guidance in a first-class way instead of hiding it.

### Upload Page

- Offer a clean user-facing ingestion form with file selection and optional owner assignment.
- Reuse the existing backend contract and allowed file types from the current Streamlit prototype.
- Show upload success details including chunk count, owner, and extracted graph entities when present.

## Visual Direction

- Brand name: **Seven**
- Primary color direction: modern off-white and charcoal surfaces with a SIX-inspired red as the accent.
- Style: clean, premium, confident, and minimal rather than playful or overly futuristic.
- Logo: a sleek red robot icon shaped around the number seven, implemented directly in the frontend as a scalable code-native mark.

## Architecture

- Keep the browser talking only to `frontend-next/app/api/company-brain/*`.
- Do not expose backend secrets or direct model access in the browser.
- Reuse the current backend proxy functions in `frontend-next/lib/companyBrain.ts`.
- Add shared presentation helpers for answer states and navigation so page behavior is consistent.

## Testing

- Add lightweight regression coverage around new shared frontend logic and branding helpers.
- Prefer a small low-friction test setup over introducing a large UI test stack for this iteration.

## Risks

- The backend API is currently a direct ECS public endpoint without ALB or HTTPS hardening.
- The frontend can improve UX, but it does not solve the existing governance and access-control gaps documented in the repo.
