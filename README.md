# the-company-brain

Shared workspace for a Start Hack Zurich prototype around SIX's "Build the Company Brain" challenge. The goal is to capture expert knowledge, preserve its context and reasoning, and make it reusable across the organization instead of leaving it trapped in individual employees, siloed tools, or one-off conversations.

## Agent Start Here

This is the first file every agent must read. Do not start with `AGENTS.md`, random source files, or guesswork.

Follow this sequence every time:

1. Read this `README.md` fully before doing anything else.
2. Run `git status --short` and `git log --oneline -5` to understand the working tree and recent history.
3. Read `AGENTS.md` only after this file, and only as a progress log / handoff log.
4. Identify the task type and then read only the supporting files that are relevant.
5. Verify actual file contents instead of trusting filenames or extensions.
6. Preserve unrelated user changes.
7. If a durable project fact changes, update this `README.md`.
8. If you make progress, discoveries, or leave handoff notes, record them in `AGENTS.md`.
9. Before finishing, verify what changed and state what remains unknown.

## Source of Truth and File Roles

- `README.md` is the canonical source of truth for project context, agent procedure, and workspace rules.
- `AGENTS.md` is not the source of truth. It is the rolling progress log, discovery log, and handoff log for agents.
- If `README.md` and `AGENTS.md` conflict, `README.md` wins.
- Supporting context files currently include:
  - `app.py`, `api_client.py`, `backend/api.py`, `rag_engine.py`, `ingest.py`, `graph_engine.py`, `knowledge_ops.py`, and `requirements.txt` for the current branch code path
  - `DEPLOY_AWS.md` for branch-specific GraphRAG deployment notes
  - `docs/aws_backend_runbook.md`, `docs/developer_environment.md`, and `docs/next_vercel_migration.md` for the current developer handoff
  - `frontend-next/` for the Vercel / Next.js migration starter
  - `research/group_idea_research.md` for brainstorming output and idea exploration
  - `research/step_by_step_procedure.md` for current execution thinking and work split
  - `research/2026-05-30_multimodal_ingestion_model_research.md` for ingestion-model and retrieval-stack research
  - `Data/SIX_Hack_Zurich-main/` for the canonical official given challenge material
- If a new durable rule, workflow, or top-level fact is discovered, update `README.md` first and then note the change briefly in `AGENTS.md`.

## Required Procedure For Every Agent

### 1. Startup Procedure

Every new agent must do the following in order:

1. Read this `README.md` fully.
2. Inspect repository state with `git status --short`.
3. Inspect recent history with `git log --oneline -5`.
4. Read `AGENTS.md` for the latest handoff notes, open questions, and recent changes.
5. Read only the additional files relevant to the current task.
6. Ask for clarification instead of guessing when the missing detail is important.

### 2. Working Procedure

While working, every agent must follow these rules:

- Keep changes scoped to the current task.
- Do not overwrite or revert unrelated user changes.
- Do not invent missing product, architecture, setup, or implementation details.
- Verify actual content of data files; do not trust extensions or filenames.
- Treat the `Data/` directory as source material, not as automatically clean or perfectly curated input.
- Treat `Data/SIX_Hack_Zurich-main/` as the canonical official corpus for new work and scripts.
- Treat top-level `Data/*` files as legacy unless a task explicitly adds a new branch-local fixture. The canonical corpus lives under `Data/SIX_Hack_Zurich-main/`.
- Keep `AGENTS.md` concise by consolidating superseded or overlapping notes instead of stacking near-duplicate entries about the same review or discovery.
- Avoid committing operating-system artifacts such as `.DS_Store`.
- Prefer updating existing top-level docs over creating parallel or conflicting guidance.

### 3. Completion Procedure

Before finishing, every agent must:

1. Verify the files changed and the current git state.
2. Update `README.md` if durable project facts changed.
3. Update `AGENTS.md` with a dated progress / handoff entry if work was done.
4. State clearly what is complete, what remains open, and what assumptions still exist.

## Project Overview

This project is centered on a real SIX Financial Information challenge. The expected solution is not just a generic chatbot or search tool. It should demonstrate how internal expertise can be captured, contextualized, governed, and reused in a way that remains useful even after the original subject-matter expert changes roles or leaves.

The broader business context is SIX Financial Information, which the challenge material describes as transforming raw data from more than 5,000 global sources into structured market, reference, regulatory, and tax insights for clients.

## Problem Statement

The central problem the project addresses is:

- critical knowledge is tied to individuals and is lost when they move roles or leave,
- information exists across documents, systems, emails, transcripts, and conversations,
- reasoning, context, and decision history are difficult to recover,
- new employees and adjacent teams struggle to find the right information reliably,
- some knowledge is sensitive and therefore must remain governed, traceable, and access-aware.

## Expected Outcome

The target solution should show:

- AI-enabled capture of tacit and explicit knowledge,
- transparent, evidence-based answers with visible sources and rationale,
- governance, traceability, and access control,
- a clickable prototype and a plausible implementation path,
- value that scales beyond one expert or one team.

## Primary Users

The challenge states that the solution is for the entire organization. In practice, the highest-value users are likely to be:

- new employees who need faster onboarding,
- compliance, legal, customer service, and operations staff who need reliable answers,
- teams that currently depend on SMEs for product coverage, regulatory interpretation, and issue resolution.

## Domain Scope

The source material is heavily focused on regulatory, tax, and reference-data workflows. Repeated topics across the challenge pack include:

- MiFID II / MiFIR investor protection, transparency, and product governance,
- SFDR / ESG disclosures and related templates,
- FATCA and broader tax-compliance workflows,
- suitability assessment, complexity assessment, sanctions / AML / KYC,
- crypto regulations, risk reporting, and trade surveillance,
- master data opening / mutations and reference-data operations.

Named SIX propositions appearing in the material include:

- Regulatory Navigator
- Tax Navigator
- Master Data - Opening & Mutations

## Representative Knowledge Tasks

The project should be able to support questions such as:

- Is a specific instrument or product type covered by an existing SIX compliance or regulatory package?
- How is an instrument classified, and which attributes drive that classification?
- Which regulatory data points matter for a given workflow or client question?
- What is the source trail and reasoning behind a compliance-related answer?
- How can another team reuse an SME's logic after that SME is unavailable?

One sample transcript shows exactly this kind of problem: a client asks whether ESG-linked structured products are covered, and the answer depends on classification, available attributes, and whether additional onboarding is needed.

## User Journey To Support

The challenge presentation frames a compliance-oriented journey roughly as:

1. Discover relevant regulatory changes or incoming questions.
2. Investigate impact, classification, and required data.
3. Prepare an approach, controls, and supporting rationale.
4. Implement the policy or operational response.
5. Monitor adherence, exceptions, and follow-up questions.

The knowledge solution should support the entire journey, not just final lookup.

## Success Criteria

The challenge material emphasizes that good work in this repo should move toward:

- a clear user journey from SME knowledge capture to end-user access,
- transparent and trustworthy answers,
- practical feasibility and scalability,
- differentiation from generic knowledge bases or copilots,
- tangible business value.

## Data Pack And Caveats

### Official Given Data

The official given challenge material now lives under:

- `Data/SIX_Hack_Zurich-main/`

This data pack is a core source of context for the project.

The branch also contains one top-level local-ingestion addition that is not part of the official nested pack:

- `Data/SIX_Hack_Zurich-main/six-global-indices-factsheet-en.pdf`

Do not recreate top-level duplicate copies of the canonical nested corpus unless there is a specific, documented reason.

### Important Caveats

Agents must assume the data pack is heterogeneous and imperfect:

- file names and extensions are not always trustworthy,
- some `.docx` or `.xlsx` files may actually contain PDF content,
- some files appear duplicated or loosely curated,
- some files are labeled confidential and must be handled accordingly,
- provenance checking and validation are part of the project problem, not just cleanup work.

### Additional Repo Context Files

Agents should consult these when relevant:

- `DEPLOY_AWS.md` for the current branch's GraphRAG deployment notes and caveats
- `research/group_idea_research.md` for idea generation and early solution directions
- `research/step_by_step_procedure.md` for current process thinking and task decomposition

### Likely Knowledge Systems In Scope

The challenge material also references likely internal knowledge and workflow systems such as:

- SharePoint
- Teams
- Outlook
- OneNote
- Word
- Excel
- Confluence
- Jira
- the SIX documentation center
- product websites

Agents should treat these as part of the real-world problem context even when the current repo only contains a subset of the underlying information.

## Repository Conventions

- Treat this repo as shared work.
- Pull before pushing when working collaboratively.
- Keep commits small and descriptive.
- Use branches and pull requests for non-trivial work unless explicitly directed otherwise.
- Do not create conflicting guidance documents when an update to `README.md` would solve the problem.
- Do not commit `.DS_Store` or similar operating-system artifacts.
- Do not commit generated runtime artifacts such as `.env`, `.env.local`, `data/`, `chroma_db/`, `.next/`, `node_modules/`, or `graph.json`.

## Current Repo Snapshot

- `app.py`, `backend/api.py`, `api_client.py`, `rag_engine.py`, `ingest.py`, `graph_engine.py`, and `knowledge_ops.py` are the current branch entry points and helper modules.
- The current product code is still a prototype and must not be mistaken for the final architecture.
- This branch adds Tier 1 GraphRAG retrieval, incremental upload utilities, a FastAPI backend boundary, Streamlit API-client mode, AWS runbook scripts, a Next.js/Vercel migration starter, and `DEPLOY_AWS.md`.
- `research/` holds generated planning, research, and analysis markdown.
- `Data/SIX_Hack_Zurich-main/` is the canonical official challenge corpus.
- Top-level `Data/*` is intentionally empty after cleanup; keep the canonical nested corpus under `Data/SIX_Hack_Zurich-main/` and only add top-level fixtures when a task genuinely needs them.
- The GraphRAG code path defaults to lowercase `data/` for uploaded files, `chroma_db/` for vectors, and `graph.json` for the graph; AWS or clean-room runs should set `COMPANY_BRAIN_DATA_DIR`, `COMPANY_BRAIN_CHROMA_DIR`, and `COMPANY_BRAIN_GRAPH_PATH` explicitly.

## Current Runtime Contract

- Local in-process demo: run `python ingest.py`, then `streamlit run app.py`.
- Backend demo: run `uvicorn backend.api:app --host 0.0.0.0 --port 8000`, then run Streamlit with `COMPANY_BRAIN_API_URL=http://localhost:8000`.
- Backend endpoints are `GET /health`, `POST /query`, and `POST /ingest`.
- Required secret for answer synthesis is `ANTHROPIC_API_KEY`.
- AWS deployment target for this branch is ECS Fargate with EFS-mounted GraphRAG artifacts, as documented in `DEPLOY_AWS.md`.
- AWS backend operations are wrapped by `./scripts/aws_backend.sh`; keep desired count at `0` when nobody is testing.
- Next.js/Vercel migration work starts in `frontend-next/`; set Vercel project root to `frontend-next` and configure `COMPANY_BRAIN_API_URL` as a server-side environment variable.

## What To Update When Facts Change

Update `README.md` when any of these change:

- project purpose or scope,
- the required agent procedure,
- durable collaboration rules,
- setup or runtime assumptions,
- repo layout or top-level file roles,
- location of core context folders such as `research/` or `Data/`,
- major project context that future agents must know.

Update `AGENTS.md` when any of these happen:

- progress was made,
- a new discovery matters for the next agent,
- there is a warning, blocker, or risk to hand off,
- an agent wants to leave a short operational note for the next agent,
- a newer note supersedes an older one and the overlapping entries should be consolidated.

## Current Unknowns / Not Yet Decided

These items are still intentionally open and must not be invented:

- final production application architecture beyond this prototype branch,
- final production governance and access-control model,
- whether Chroma-on-EFS remains sufficient after the demo or should be replaced by a managed retrieval backend,
- whether ingestion should continue to use local files or move to an object-storage workflow.

The challenge explicitly allows freedom in technology choice, so these should only be documented once they are actually decided.
