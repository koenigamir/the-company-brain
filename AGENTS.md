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
