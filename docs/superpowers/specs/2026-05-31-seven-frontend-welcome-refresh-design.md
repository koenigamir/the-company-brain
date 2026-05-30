# Seven Frontend Welcome Refresh Design

**Date:** 2026-05-31

## Goal

Refresh `frontend-next/` so the product matches the updated backend contract and the intended user flow:

- `"/"` becomes the branded identity entry with the large `intelligence` hero
- `"/welcome"` becomes the actual product welcome page
- `"/query"` and `"/upload"` keep the same Seven aesthetic while supporting the new backend behavior

## Approved Scope

- Use the real SIX wordmark in the title area instead of the temporary text badge.
- Keep the centered intro splash feel on `"/"` with entry links for `Welcome`, `Query`, and `Add files`.
- Make the `Welcome` link open a real page again instead of looping back to the splash screen.
- Expand the welcome experience so it reflects the current `frontend-next/README.md` contract:
  - backend health and persistence state
  - role catalog
  - stored document metadata
- Update query and upload flows to match the current FastAPI contract for roles, documents, ingest, and gap tickets.

## Product Shape

### Entry Page (`/`)

- Present a minimal branded hero with the robot-`7` + `intelligence` wordmark.
- Show `seven created for` with the actual SIX logo rendered in-code so no external asset dependency is required.
- Offer three clear entry actions:
  - `Welcome`
  - `Query`
  - `Add files`

### Welcome Page (`/welcome`)

- Restore the earlier richer welcome-page storytelling instead of using the splash screen as the whole landing experience.
- Keep the same Seven visual language already established in `globals.css`.
- Add live backend-driven panels that surface:
  - current health and persistence status
  - available roles from `GET /roles`
  - current document records from `GET /documents`
- Keep the page product-facing rather than admin-heavy.

### Query Page (`/query`)

- Preserve the prompt-first workflow and answer rendering.
- Keep graph debug details and gap-routing explanations.
- Update gap-ticket creation so it sends the backend-required `gap` object rather than the old string placeholder.
- Surface multi-role routing cleanly when returned by the backend.

### Upload Page (`/upload`)

- Preserve the current upload flow and aesthetic.
- Continue loading roles dynamically from `GET /roles`.
- Show richer post-ingest metadata when the backend returns it, without assuming only document/PDF uploads.

## Architecture

- Browser code must continue to call only `frontend-next/app/api/company-brain/*`.
- Shared request/response types stay in `frontend-next/types/companyBrain.ts`.
- Shared backend helpers stay in `frontend-next/lib/companyBrain.ts`.
- Shared UI derivation logic stays in `frontend-next/lib/companyBrainPresentation.ts`.
- The new `"/welcome"` page should own the live dashboard-style summary for health, roles, and documents, instead of duplicating those fetches across unrelated pages.

## Error Handling

- If roles or documents cannot load on the welcome page, show a visible fallback state without breaking the rest of the page.
- If gap-ticket creation fails, preserve the current query answer and show the ticket-specific failure message.
- Health should continue to degrade gracefully in the header if the backend is down.

## Testing

- Update or add small regression tests for any shared presentation helpers and branding components touched by the refresh.
- Run `npm test`, `npm run typecheck`, and `npm run build` in `frontend-next/`.

## Risks

- The live backend URL is still a public ECS task IP and can change independently of the frontend.
- The frontend can surface roles, documents, and gap routing more clearly, but it still does not solve production auth or governance.
