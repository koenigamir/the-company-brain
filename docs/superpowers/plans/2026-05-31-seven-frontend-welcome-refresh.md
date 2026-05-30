# Seven Frontend Welcome Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh `frontend-next` so the splash page, welcome flow, and backend-driven workspaces match the updated Company Brain API contract while staying in the existing Seven aesthetic.

**Architecture:** Keep all browser traffic behind the Next.js proxy routes, introduce a dedicated `"/welcome"` page for the richer product overview, and tighten shared types/helpers around the new health, roles, documents, and gap-ticket payloads. Preserve the existing query/upload page structure instead of refactoring the app into a new routing model.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS, Node test runner, `tsx`

---

### Task 1: Update shared types and presentation helpers for the new backend contract

**Files:**
- Modify: `frontend-next/types/companyBrain.ts`
- Modify: `frontend-next/lib/companyBrain.ts`
- Modify: `frontend-next/lib/companyBrainPresentation.ts`
- Modify: `frontend-next/lib/companyBrainPresentation.test.ts`

- [ ] Add missing type coverage for document rows, role metadata, gap-ticket requests, and any response fields used by the UI.
- [ ] Update helper logic so routing summaries and owner displays handle single-role and multi-role gap routing cleanly.
- [ ] Write or adjust tests first for any shared helper behavior that changes.
- [ ] Run the shared frontend tests to verify the new helper behavior.

### Task 2: Replace the temporary SIX title treatment with the real logo system

**Files:**
- Modify: `frontend-next/components/brand-mark.tsx`
- Modify: `frontend-next/components/brand-mark.test.tsx`
- Modify: `frontend-next/app/globals.css`

- [ ] Update the shared branding component so it can render the correct SIX mark in-code while preserving the existing Seven robot mark.
- [ ] Keep the result reusable both in the splash page and in the persistent header.
- [ ] Refresh the branding test to verify the new mark still renders as SVG-backed UI.

### Task 3: Split splash and welcome into two distinct pages

**Files:**
- Modify: `frontend-next/app/page.tsx`
- Create: `frontend-next/app/welcome/page.tsx`
- Modify: `frontend-next/components/site-header.tsx`
- Modify: `frontend-next/app/globals.css`

- [ ] Keep `"/"` as the minimal identity-first splash page with links to `"/welcome"`, `"/query"`, and `"/upload"`.
- [ ] Restore a fuller welcome page on `"/welcome"` using the previous landing-page structure as the base.
- [ ] Update shared navigation so `Welcome` routes to `"/welcome"` and the active-state logic still behaves correctly.
- [ ] Add only the CSS needed for the new splash/welcome split while preserving the existing visual language.

### Task 4: Add live backend overview content to the welcome page

**Files:**
- Create: `frontend-next/app/welcome/page.tsx`
- Modify: `frontend-next/app/globals.css`

- [ ] Fetch health, roles, and document records from the existing local proxy routes on the welcome page.
- [ ] Show backend/persistence state, role catalog, and recent document metadata in a product-facing summary layout.
- [ ] Keep the page resilient if one data source fails while others still succeed.

### Task 5: Align query and upload flows with the migrated backend behavior

**Files:**
- Modify: `frontend-next/app/query/page.tsx`
- Modify: `frontend-next/app/upload/page.tsx`
- Modify: `frontend-next/types/companyBrain.ts`

- [ ] Update gap-ticket submission so the payload includes the real backend `gap` object.
- [ ] Preserve answer rendering while making room for richer routing and ticket feedback.
- [ ] Keep upload compatible with current role loading and richer ingest metadata from the backend.

### Task 6: Verify and document the refresh

**Files:**
- Modify: `AGENTS.md`

- [ ] Run `npm.cmd test` in `frontend-next`.
- [ ] Run `npm.cmd run typecheck` in `frontend-next`.
- [ ] Run `npm.cmd run build` in `frontend-next`.
- [ ] Add a concise 2026-05-31 agent-log entry describing the welcome refresh and backend-contract alignment.
