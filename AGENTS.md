# Agent Log

## Purpose Of This File

This file is the rolling progress log and handoff log for agents working in this repository.

It is not the source of truth for workspace rules or project context. `README.md` holds the canonical instructions. Read `README.md` first, then use this file to understand what recent agents did and what the next agent should know.

## Logging Rules

- Add new entries in reverse chronological order.
- Keep entries factual, concise, and task-oriented.
- Record progress, discoveries, blockers, risks, and handoff notes.
- Do not move durable project rules into this file without also updating `README.md`.
- If a durable fact changes, update `README.md` first and then note the change here briefly.
- Do not use this file for scratch notes, brainstorming fragments, or unsupported assumptions.

## Entry Template

Use this structure for new entries:

### YYYY-MM-DD - Short Title

- Context:
- Actions:
- Changes made:
- Risks / open questions:
- Next agent:

## Current Log

### 2026-05-31 - Workspace Header Navigation Restored

- Context: The user wanted the top navigation back on all workspace pages, but not on the intro start slide, and also needed a direct way back to the start page.
- Actions: Added a red header test for the two page modes, split the header into a pure frame plus pathname-aware wrapper, restored the top navigation for internal routes, and verified it with tests, typecheck, build, plus local browser screenshots on `/` and `/welcome`.
- Changes made: `frontend-next/components/site-header.tsx` now shows `Start`, `Welcome`, `Query`, and `Add files` on non-root pages while keeping `/` brand-only; `frontend-next/components/site-header.test.tsx` now covers both header modes.
- Risks / open questions: On narrow viewports the nav intentionally wraps below the brand block, so any future mobile redesign should preserve all four destinations rather than hiding one.
- Next agent: If the header gets redesigned again, keep the root-vs-workspace split explicit because the splash page and the app pages intentionally have different top-bar behavior.

### 2026-05-31 - Restricted Query Details Tightened

- Context: The query UI still exposed detailed answer content and fallback metadata inside `More information` even when the backend signaled that all relevant company sources were restricted for the selected demo account.
- Actions: Traced the issue through the frontend answer panel and backend access tests, added a red regression test for the fully restricted case, updated the query details rendering to switch into an access-only mode when there are restricted sources but no accessible sources, and reran frontend verification.
- Changes made: `frontend-next/components/query-answer-panel.tsx` now hides detailed answer text, owner/source/update metadata, graph trace, and gap-routing content when the response is fully restricted; `frontend-next/components/query-answer-panel.test.tsx` now covers that case explicitly.
- Risks / open questions: Partial-access responses still show allowed sources and details, which matches the backend contract because only blocked sources are omitted there.
- Next agent: If the backend contract later adds an explicit boolean for `fully_restricted`, prefer that over inferring the state from `restricted_source_count > 0` plus an empty `sources` list.

### 2026-05-31 - Welcome Role Counts Clarified

- Context: The welcome catalog already counted documents per team, but the label needed to read more explicitly in the UI.
- Actions: Added a regression check for the role-count wording, changed the catalog badge text from generic `documents` to `indexed documents`, and reran the frontend test suite.
- Changes made: `frontend-next/app/welcome/page.tsx` now renders `N indexed document(s)` on each role card; `frontend-next/components/brand-mark.test.tsx` now checks for that wording.
- Risks / open questions: Counts still depend on `/documents` being reachable; if the backend is unavailable, the UI will correctly show zero indexed documents.
- Next agent: Keep the welcome catalog count wording aligned with the backend document registry semantics if this card is redesigned again.

### 2026-05-31 - Frontend Roles And Access Parity

- Context: The frontend needed to fully consume the new backend role/access contract, including demo accounts, viewer-scoped query access, document visibility metadata, and upload access controls.
- Actions: Re-read the frontend/backend handoff docs, added red tests for viewer account forwarding and access rendering, implemented the missing proxy/helper/type updates, wired the new role/access UI into Welcome, Query, and Upload, updated the frontend README, and verified with tests, typecheck, build, plus a local browser check on `http://127.0.0.1:3100`.
- Changes made: Added the `demo-accounts` Next proxy route and frontend fetch helper; query now loads backend-seeded demo accounts, sends `viewer_account_id`, and renders `access_notice`, `restricted_source_count`, and viewer clearance/access scope; upload now supports optional `visibility_roles` and `min_clearance` controls and shows returned access metadata; welcome now shows document counts per role card plus a compact document access section with visibility and clearance labels; added regression tests in `frontend-next/lib/companyBrain.test.ts`, `frontend-next/lib/companyBrainPresentation.test.ts`, and `frontend-next/components/query-answer-panel.test.tsx`.
- Risks / open questions: Static verification is clean, but the configured backend URL `http://3.76.28.239:8000` was unreachable from this environment during the final browser/health check, so the live Welcome snapshot fell back to empty counts until the backend becomes reachable again.
- Next agent: If you need live end-to-end confirmation, bring the backend back up or point `COMPANY_BRAIN_API_URL` at a reachable instance, then re-check `/welcome`, `/query`, and `/upload` against real role/document data.

### 2026-05-31 - Welcome Catalog Reduced And Cleaned

- Context: The welcome page still had a visually messy live snapshot area plus too much secondary structure around roles.
- Actions: Added a frontend regression test for the reduced welcome layout, rebuilt the welcome page around a cleaner snapshot card, removed the full workspace-overview block, removed the role selector and document list from welcome, and kept only a simplified catalog of roles with descriptions.
- Changes made: `frontend-next/app/welcome/page.tsx` now shows a cleaner aligned snapshot panel and a single `Catalog Overview` section; `frontend-next/app/globals.css` now styles the new snapshot-card grid and simplified catalog cards; frontend tests/build were rerun successfully.
- Risks / open questions: The welcome page is now intentionally much more minimal, so any future request to reintroduce document visibility there should be treated as a fresh design choice rather than assumed behavior.
- Next agent: Keep `/welcome` focused on entry and catalog scanning unless the product direction explicitly asks for richer live operational detail again.

### 2026-05-31 - Branding And Copy Simplified Further

- Context: The frontend still needed finer visual tuning on the hero branding plus a more stripped-back query/upload presentation.
- Actions: Sampled the dominant red from the provided SIX logo asset, redesigned the robot `7` glyph to read more explicitly as a robot in the same red, adjusted the global background toward a light-red gradient, restored the `seven created for` lockup on the splash page, converted the provided SIX PNG to a transparent-background version inside `frontend-next/public/`, and shortened the query/upload intro copy even further.
- Changes made: `frontend-next/components/brand-mark.tsx` now uses a more robotic `7` in `#E42313`; the splash page again says `seven created for`; `frontend-next/app/query/page.tsx` now opens with only the centered `Ask the company knowledge base` heading plus the question form and no longer shows the earlier extra helper copy; `frontend-next/app/upload/page.tsx` no longer shows the long explanatory intro sentence; `frontend-next/app/globals.css` now uses a lighter red gradient background; `frontend-next/public/six-logo.png` was rewritten with transparency so only the red SIX mark remains.
- Risks / open questions: Tests, typecheck, and build passed before the final transparent-PNG cleanup; no code logic changed during that last asset conversion step.
- Next agent: If the team later wants a sharper sponsor mark at larger sizes, replace the current transparent PNG with a true SVG/vector version while preserving the same proportions and red tone.

### 2026-05-31 - Intelligence Header Simplified And Role UX Surfaced

- Context: The frontend needed a cleaner branded shell, the exact SIX logo asset from the user, a shorter welcome page, plainer query-answer rendering, and fuller exposure of the repo's implemented role model.
- Actions: Re-read the repo docs and current frontend state, copied the provided SIX logo into `frontend-next/public/`, added test coverage for the reduced header and collapsed query details, removed the top nav/health bar, replaced in-code SIX artwork with the exact provided logo image, shortened the welcome page, surfaced the shared SIX role catalog and multi-role document ownership in the UI, and updated query/upload flows to match the newer role and ingest metadata.
- Changes made: `frontend-next/` now shows only the `intelligence` brand in the top header, uses the provided SIX logo image asset, keeps query answers in plain text with a `More information` toggle for deeper traces, shows richer role cards and role-filtered recent documents on `/welcome`, and exposes upload-side role descriptions, role reasons, extractor names, and extraction confidence where available.
- Risks / open questions: Unit tests, typecheck, and production build all pass; an extra live browser-style verification inside Codex was attempted but local process launch hit a Windows `Path`/`PATH` collision in `Start-Process`, so visual runtime confirmation in this session still relies on build and test evidence.
- Next agent: Keep using `frontend-next/public/six-logo.png` as the exact sponsor mark, preserve the minimal top header, and if you need local visual QA in Codex first solve the current Windows background-process launch issue or use an external browser.

### 2026-05-31 - Seven Welcome Refresh And Backend Contract Alignment

- Context: The frontend needed the correct SIX title branding, a real welcome route again, and UI support for the migrated backend routes now documented in `frontend-next/README.md`.
- Actions: Wrote a fresh spec and implementation plan under `docs/superpowers/`, restored a dedicated intro splash at `/`, created a richer `/welcome` page, updated shared frontend helpers and types, aligned gap-ticket submission with the current backend payload, and extended frontend tests around the new shared logic.
- Changes made: `frontend-next/` now uses a splash entry at `/`, a full welcome workspace at `/welcome`, the in-code SIX logo in the title area, live welcome-page loading of health/roles/documents through `/api/company-brain/*`, multi-role-aware gap-ticket payload creation, richer upload metadata display, and updated frontend handoff docs.
- Risks / open questions: The UI now matches the current backend contract more closely, but the live backend URL still points to a temporary ECS public IP and production auth/HTTPS remain open; Codex's in-app browser still returned `net::ERR_BLOCKED_BY_CLIENT` on local `localhost` verification, so visual confirmation relied on build/test evidence instead.
- Next agent: Continue from `frontend-next/`, keep browser calls behind the Next proxy routes, and if you need a visual check inside Codex verify first whether the in-app browser can access local URLs in this environment.

### 2026-05-31 - Frontend Handoff Updated

- Context: After the migrated GraphRAG backend was deployed to ECS task definition revision 2, `frontend-next/` needed to be cleaned up as the frontend developer handoff.
- Actions: Restored the preserved Seven frontend progress from the pre-migration stash, reworked the Next.js proxy layer around the live migrated backend contract, added exact frontend setup notes, and updated handoff docs.
- Changes made: Added proxy routes for roles, documents, and gap tickets; expanded frontend request/response types; preserved the Seven landing/query/upload pages, shared header, brand mark, presentation helpers, and tests; updated query/upload to use the migrated backend answer, role, ingest, and gap-ticket flows; added `frontend-next/README.md`; updated README and developer migration docs.
- Risks / open questions: The checked-in UI is still a developer workspace, not the final Seven product interface; the current backend URL `http://63.176.100.250:8000` is an ECS public task IP and can change after restart; ALB/HTTPS/auth remain open.
- Next agent: Frontend developers should start in `frontend-next/README.md`, keep browser code behind `/api/company-brain/*`, and run `npm run typecheck` plus `npm run build` before pushing UI changes.

### 2026-05-30 - New GraphRAG Architecture Migration

- Context: After the AWS backend branch was pushed, `origin/feature/tier1-graphrag` advanced with a new architecture for multimodal ingest, role resolution, local/Supabase persistence, and literal-token retrieval.
- Actions: Pulled/fetched first, stashed unrelated local frontend changes as `pre-migration preserve local frontend changes`, merged `origin/feature/tier1-graphrag` into `codex/aws-backend-graphrag`, and resolved conflicts by keeping AWS/Next infrastructure while adopting the new RAG architecture.
- Changes made: Added `image_ingest.py`, `media_ingest.py`, `role_resolver.py`, `store.py`, `supabase_schema.sql`, new demo data assets, expanded API endpoints for roles/documents/gap tickets, preserved Streamlit API-client mode, and updated docs for multimodal runtime paths and Vercel contract.
- Risks / open questions: The running AWS service still needs a rebuilt backend image and ECS rollout before these new code paths are active remotely; raw Fargate public IP remains temporary; the pre-migration stash still exists and should be reviewed before dropping.
- Next agent: Rebuild/push the backend image, add `COMPANY_BRAIN_STORE_DIR=/mnt/company-brain/localstore` to the ECS task definition, force a new ECS deployment, run smoke tests, then decide whether to reapply or discard the preserved local frontend stash.

### 2026-05-30 - README And Agent Log Audit

- Context: After the AWS/Next developer handoff was pushed, the docs needed a final consistency check.
- Actions: Re-read the current README and AGENTS top entries, checked git state, and corrected stale README wording around the `six-global` PDF location.
- Changes made: README now describes `Data/SIX_Hack_Zurich-main/six-global-indices-factsheet-en.pdf` as a nested canonical-corpus addition rather than a top-level file.
- Risks / open questions: No new product risk found in this doc pass; existing open items remain backend auth/HTTPS/stable DNS, final Vercel setup, and production governance/access control.
- Next agent: Treat README as current for the AWS backend, Streamlit API mode, and Next/Vercel starter handoff; use the latest AGENTS entries for operational context.

### 2026-05-30 - Frontend Verification Follow-Up

- Context: The previously denied network/process checks needed to be rerun after the developer environment commit.
- Actions: Installed Node 22 with `nvm`, diagnosed the local Next/TypeScript hang, removed stale generated frontend artifacts, reinstalled dependencies, reran frontend and backend verification, and checked AWS ECS status.
- Changes made: Added `frontend-next/.nvmrc`, documented Node 22 usage and the cleanup command in `docs/developer_environment.md`, and pinned frontend TypeScript to `5.8.3` so installs do not float to the version that reproduced the local compiler hang.
- Risks / open questions: The Next.js starter still needs product UI work and Vercel project setup; local generated `node_modules/`, `.next/`, and `tsconfig.tsbuildinfo` remain ignored and should be regenerated by each developer.
- Next agent: Use `nvm use` inside `frontend-next/`, then run `npm install`, `npm run typecheck`, and `npm run build` before frontend changes.

### 2026-05-30 - Developer Environment And Next Starter

- Context: The team needed a shared developer handoff after the AWS backend deployment, plus a starting point for replacing Streamlit with Vercel + Next.js.
- Actions: Added runbooks, an AWS backend helper script, and a `frontend-next/` Next.js starter that proxies browser requests through Next API routes to the FastAPI backend.
- Changes made: Added `docs/aws_backend_runbook.md`, `docs/developer_environment.md`, `docs/next_vercel_migration.md`, `scripts/aws_backend.sh`, and the `frontend-next/` app with query, health, and ingest proxy routes.
- Risks / open questions: The Next.js starter is a functional migration baseline, not a finished product UI; Vercel still needs project setup with root `frontend-next` and server-side `COMPANY_BRAIN_API_URL`; backend auth/HTTPS/stable DNS remain open.
- Next agent: Start from `docs/developer_environment.md`, use `./scripts/aws_backend.sh start` only while testing, and implement the Next.js UI against `/api/company-brain/*` rather than calling AWS directly from browser code.

### 2026-05-30 - AWS ECS Backend Deployed

- Context: Continued the `codex/aws-backend-graphrag` backend deployment after AWS profile setup and credential rotation.
- Actions: Created AWS resources in account `669960693304` / `eu-central-1`: ECR repo, CodeBuild project, ECS cluster/service, EFS filesystem and mount targets, security groups, IAM roles, CloudWatch logs, and Secrets Manager entry for `ANTHROPIC_API_KEY`; built the backend image in CodeBuild because local Docker became unhealthy after a failed large build; ran one-off ECS ingest against the official corpus and started the backend service.
- Changes made: Added `buildspec.backend.yml`; updated `Dockerfile.backend` to install CPU PyTorch first; added a compatibility import in `knowledge_ops.py` for modern `langchain_text_splitters`.
- Risks / open questions: The backend is exposed directly on ECS task public IP/port `8000` when running via security group `0.0.0.0/0`, which is acceptable only for a short demo; there is no ALB, HTTPS, auth, or stable DNS yet; local Docker Desktop still needs repair/restart outside this repo.
- Next agent: The ECS service is intentionally scaled to `0` when idle. Run `./scripts/aws_backend.sh start` to get a fresh backend URL for Streamlit or Next.js testing, and `./scripts/aws_backend.sh stop` when done.

### 2026-05-30 - Data Footprint Cleanup

- Context: The repo needed a space-saving cleanup, and the existing docs already identified `Data/SIX_Hack_Zurich-main/` as the canonical official corpus while warning that the top-level `Data/` copies were legacy.
- Actions: Re-read `README.md`, checked repo state and recent history, compared top-level `Data/` files against the canonical nested corpus byte-for-byte, removed only the identical top-level duplicates plus local `.DS_Store` files, and updated the durable repo-layout notes in `README.md`.
- Changes made: Deleted tracked duplicate files from top-level `Data/` for a savings of about 47.84 MiB; preserved the canonical `Data/SIX_Hack_Zurich-main/` corpus; updated `README.md` so it no longer claims the duplicate top-level corpus still exists.
- Risks / open questions: `.git/.DS_Store` remains because sandbox permissions blocked its removal, but it is tiny and unrelated to project content; deleting the tracked duplicates is a real branch change, so any teammate who still references the old top-level paths must switch to `Data/SIX_Hack_Zurich-main/`.
- Next agent: If you touch ingestion or docs next, keep using `Data/SIX_Hack_Zurich-main/` as the source of truth and do not restore top-level duplicate corpus files.

### 2026-05-30 - AWS Backend Boundary For GraphRAG

- Context: The team chose the backend-API path for testing the local GraphRAG model through Streamlit while preparing for AWS deployment.
- Actions: Created the `codex/aws-backend-graphrag` branch, added test coverage for backend client/config behavior, introduced a FastAPI wrapper, added Streamlit backend-client mode, made runtime artifact paths environment-configurable, and updated deployment/docs.
- Changes made: Added `backend/api.py`, `api_client.py`, `Dockerfile.backend`, `.dockerignore`, and tests; updated `app.py`, `graph_engine.py`, `knowledge_ops.py`, `requirements.txt`, `.gitignore`, `README.md`, and `DEPLOY_AWS.md`.
- Risks / open questions: FastAPI and LangChain runtime dependencies are not installed in this local sandbox, so backend server smoke tests were not run here; rotate the AWS credentials pasted into chat before any deployment; prototype governance gaps still remain.
- Next agent: Install requirements in a virtualenv, run `python ingest.py`, start `uvicorn backend.api:app --host 0.0.0.0 --port 8000`, and test Streamlit with `COMPANY_BRAIN_API_URL=http://localhost:8000`.

### 2026-05-30 - Post-Merge Top-Level Cleanup

- Context: Pulled `feature/tier1-graphrag` after other developers had merge issues and re-read the full top-level code and doc surface to check whether the branch docs still matched the actual branch contents.
- Actions: Pulled the branch, reviewed `README.md`, `AGENTS.md`, `DEPLOY_AWS.md`, `app.py`, `rag_engine.py`, `ingest.py`, `graph_engine.py`, `knowledge_ops.py`, `.gitignore`, and the tracked data/research layout, then cleaned the top-level docs without changing implementation behavior.
- Changes made: `README.md` now reflects the actual GraphRAG branch file set, distinguishes canonical official corpus files from branch-local top-level `Data/*` additions, and records the current lowercase-`data/` portability caveat; `DEPLOY_AWS.md` now states that its instructions are branch notes rather than a fully validated clean-room deploy recipe and includes the missing `knowledge_ops.py` role.
- Risks / open questions: The branch docs are cleaner, but the underlying GraphRAG implementation still expects lowercase `data/` while the tracked corpus is under `Data/`, so deploy/setup portability remains unresolved.
- Next agent: If you touch ingest, deploy, or branch cleanup next, fix the corpus-path portability issue before expanding GraphRAG behavior or AWS automation further.

### 2026-05-30 - README / AGENTS Cleanup And Consolidation

- Context: The top-level docs had started to accumulate overlapping review notes and path clarifications, which made the repo harder to scan quickly.
- Actions: Reviewed repo history, current layout, `README.md`, and all existing `AGENTS.md` entries, then consolidated overlapping 2026-05-30 notes into a smaller set while preserving the underlying findings.
- Changes made: `README.md` now lists the current prototype entry points and the multimodal ingestion research memo, and adds an explicit rule to consolidate superseded `AGENTS.md` notes instead of stacking near-duplicates.
- Risks / open questions: The log is cleaner, but it will drift again if future review notes are appended without folding them into the latest relevant entry.
- Next agent: Keep adding new facts, but collapse overlapping review notes when a newer entry supersedes an older one.

### 2026-05-30 - Prototype And Branch Review Findings

- Context: Reviewed both the current Streamlit/LangChain prototype and branch `feature/tier1-graphrag` to understand the current implementation state and merge risks without switching the working tree.
- Actions: Read `README.md`, checked repo state and recent history, reviewed `app.py`, `rag_engine.py`, `ingest.py`, `.env.example`, `.gitignore`, and `requirements.txt`, validated sample corpus file types, inspected the branch diff and the full contents of `graph_engine.py`, `knowledge_ops.py`, `rag_engine.py`, `ingest.py`, `app.py`, `README.md`, and `DEPLOY_AWS.md`, and ran syntax-level verification plus dependency-free graph checks.
- Changes made: No product code changes. Established the current risk baseline: simulated role selection does not enforce access control, confidential-labeled content is not access-restricted, displayed role-owner and last-updated metadata are guessed or synthetic, ingestion still targets `data/` instead of canonical `Data/SIX_Hack_Zurich-main/`, runtime assumes dependencies, `chroma_db/`, and LLM access are already in place, and there are no automated tests.
- Risks / open questions: The GraphRAG branch adds heuristic graph expansion and upload flow before the governance model is fixed; one keyword (`sustainab`) is compiled as an exact word and therefore does not match `sustainable`; branch docs reintroduced stale pre-`research/` paths; graph build, hybrid retrieval, upload persistence, and gap-routing behavior remain untested.
- Next agent: Fix corpus-path portability and governance first, then add tests around ingest, retrieval, graph expansion, persistence, and gap routing before treating the branch as merge-ready.

### 2026-05-30 - Research Folder And Canonical Corpus Alignment

- Context: Generated planning/research docs were moved out of the repo root, and the official challenge corpus now coexists with duplicated top-level legacy copies under `Data/`.
- Actions: Created `research/`, moved the existing generated markdown files there, and updated canonical README references so agent startup points to `research/step_by_step_procedure.md` and `Data/SIX_Hack_Zurich-main/`.
- Changes made: `research/group_idea_research.md` and `research/step_by_step_procedure.md` are now the canonical research/planning paths; `Data/SIX_Hack_Zurich-main/` is documented as the canonical official corpus; duplicated top-level `Data/*` files are documented as legacy non-canonical copies.
- Risks / open questions: The duplicate corpus files still exist physically and can still be targeted by code or scripts until the repo layout itself is cleaned up.
- Next agent: Use `research/` first for planning/research docs and `Data/SIX_Hack_Zurich-main/` for new scripts or ingestion work unless there is a specific reason to inspect the legacy duplicates.

### 2026-05-30 - Multimodal Ingestion Model Research

- Context: Read the canonical repo docs first, then researched high-quality multimodal ingestion models and architectures that could normalize mixed enterprise content into the structure already envisioned for the Company Brain.
- Actions: Read `README.md`, checked git state and recent history, reviewed `app.py`, `rag_engine.py`, `ingest.py`, `requirements.txt`, `research/group_idea_research.md`, and `research/step_by_step_procedure.md`, verified sample file contents and mislabeled extensions, and researched AWS, Bedrock vs SageMaker, Docling, Unstructured, MinerU, DeepSeek-OCR-2, Qwen3-VL, Whisper/WhisperX/pyannote, Mistral OCR, LlamaParse, multimodal retrieval models, retrieval backends, and relevant GitHub implementations.
- Changes made: Added `research/2026-05-30_multimodal_ingestion_model_research.md` and expanded it with a broader option landscape, AWS-credit-aware recommendations for a `100 CHF` two-day budget, additional managed-parser options, and retrieval backend alternatives beyond the original open-source-on-AWS path.
- Risks / open questions: The live prototype still uses random role/freshness metadata and vector-only retrieval, and still lacks the normalized `data/normalized/*` artifacts described in planning docs; the best next implementation path still depends on whether the team prioritizes cheapest two-day delivery, AWS-native services, or open-source model hosting; `README.md`, `research/group_idea_research.md`, and the `research/step_by_step_procedure.md` move already had uncommitted changes and were not modified here.
- Next agent: If implementation starts, decide first between the low-cost local-first path and the open-source-on-AWS path, then refactor `ingest.py` into modality-aware normalization, emit the shared normalized JSON contracts, and upgrade embeddings/reranking before changing answer synthesis or UI behavior.

### 2026-05-30 - README / AGENTS Role Split

- Context: The workspace documentation structure was redesigned so new agents have one canonical first-read entry point.
- Actions: Reframed `README.md` as the full operating manual and converted `AGENTS.md` into a rolling progress and handoff log.
- Changes made: README now defines the mandatory startup, working, and completion procedure for all agents; AGENTS now serves only as a log.
- Risks / open questions: The new structure only works if future agents keep durable rules in README and temporary notes in AGENTS.
- Next agent: Read `README.md` first, then use this log for recent handoff context.

### 2026-05-30 - Official Data Added

- Context: The official challenge data folder was added to the repository.
- Actions: Added the `Data/SIX_Hack_Zurich-main/` directory and pushed it to `origin`.
- Changes made: Official source material is now available in-repo for context gathering and analysis.
- Risks / open questions: The data pack is heterogeneous, includes mislabeled file types, and includes a confidential-labeled file. Agents should validate contents before relying on filenames or extensions.
- Next agent: Use the data folder as source material, but handle it carefully and verify file contents directly.

### 2026-05-29 - Initial Challenge Context Added

- Context: The first documentation pass extracted the main project context from the SIX challenge material and the public reference repo.
- Actions: Summarized the challenge, users, domain scope, data caveats, and project unknowns into the repo docs.
- Changes made: The workspace moved from placeholder docs to project-specific guidance.
- Risks / open questions: Implementation stack and architecture are still undecided and must not be invented.
- Next agent: Use the challenge context already captured in `README.md` instead of re-deriving basic project facts from scratch unless new evidence changes them.
