# Seven Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a branded three-page Seven frontend in `frontend-next` that uses the existing Next proxy routes to query, inspect, and ingest Company Brain knowledge.

**Architecture:** Keep data fetching in the browser pointed at the existing Next API routes, add shared branding and answer-presentation helpers, and split the UI into a landing page, a query workspace, and an upload workspace. Use lightweight tests for new shared logic so the frontend can evolve without regressions.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS, Node test runner, `tsx`

---

### Task 1: Add regression harness for shared frontend logic

**Files:**
- Modify: `frontend-next/package.json`
- Create: `frontend-next/lib/companyBrainPresentation.test.ts`
- Create: `frontend-next/components/brand-mark.test.tsx`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Add the minimal test script and runtime dependency**
- [ ] **Step 3: Run tests to verify they fail for missing modules**
- [ ] **Step 4: Implement the tested helpers and components**
- [ ] **Step 5: Run tests again to verify they pass**

### Task 2: Build shared Seven branding and navigation

**Files:**
- Create: `frontend-next/components/brand-mark.tsx`
- Create: `frontend-next/components/site-header.tsx`
- Create: `frontend-next/lib/companyBrainPresentation.ts`
- Modify: `frontend-next/app/layout.tsx`
- Modify: `frontend-next/app/globals.css`

- [ ] **Step 1: Implement the shared logo, navigation shell, and backend-status affordance**
- [ ] **Step 2: Add the new visual system tokens and responsive layout styles**
- [ ] **Step 3: Verify typecheck remains clean**

### Task 3: Replace the placeholder home page with the Seven landing page

**Files:**
- Modify: `frontend-next/app/page.tsx`
- Modify: `frontend-next/app/globals.css`

- [ ] **Step 1: Build the welcome-page sections and CTA flow**
- [ ] **Step 2: Add the scroll-target CTA that leads into the query page**
- [ ] **Step 3: Verify the page still renders cleanly through typecheck**

### Task 4: Build the dedicated query workspace

**Files:**
- Create: `frontend-next/app/query/page.tsx`
- Modify: `frontend-next/types/companyBrain.ts`
- Modify: `frontend-next/app/globals.css`

- [ ] **Step 1: Move the query experience to its own page**
- [ ] **Step 2: Surface confidence, sources, owner, dates, graph insights, and gap routing**
- [ ] **Step 3: Keep the page resilient to backend and network failures**

### Task 5: Build the dedicated upload workspace

**Files:**
- Create: `frontend-next/app/upload/page.tsx`
- Modify: `frontend-next/types/companyBrain.ts`
- Modify: `frontend-next/app/globals.css`

- [ ] **Step 1: Implement the user-facing upload form**
- [ ] **Step 2: Connect it to the existing ingest proxy route**
- [ ] **Step 3: Show success and failure states with ingest metadata**

### Task 6: Update docs and verify

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Record the new Next frontend shape in the durable project docs**
- [ ] **Step 2: Add a concise agent-log entry with work completed and remaining risks**
- [ ] **Step 3: Install frontend dependencies if needed**
- [ ] **Step 4: Run `npm test`, `npm run typecheck`, and `npm run build` in `frontend-next`**
