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

### 2026-05-30 - Multimodal Ingestion Model Research

- Context: Read the canonical repo docs first, then researched high-quality multimodal ingestion models and architectures that could normalize mixed enterprise content into the structure already envisioned for the Company Brain.
- Actions: Read `README.md`, checked git state and recent history, reviewed `app.py`, `rag_engine.py`, `ingest.py`, `requirements.txt`, `group_idea_research.md`, and `research/step_by_step_procedure.md`, verified sample file contents and mislabeled extensions, and researched AWS, Bedrock vs SageMaker, Docling, Unstructured, MinerU, DeepSeek-OCR-2, Qwen3-VL, Whisper/WhisperX/pyannote, Mistral OCR, LlamaParse, multimodal retrieval models, retrieval backends, and relevant GitHub implementations.
- Changes made: Added `research/2026-05-30_multimodal_ingestion_model_research.md` and expanded it with a broader option landscape, AWS-credit-aware recommendations for a `100 CHF` two-day budget, additional managed-parser options, and retrieval backend alternatives beyond the original open-source-on-AWS path.
- Risks / open questions: The live prototype still uses random role/freshness metadata and vector-only retrieval, and still lacks the normalized `data/normalized/*` artifacts described in planning docs; the best next implementation path still depends on whether the team prioritizes cheapest two-day delivery, AWS-native services, or open-source model hosting; `README.md`, `group_idea_research.md`, and the `step_by_step_procedure.md` move already had uncommitted changes and were not modified here.
- Next agent: If implementation starts, decide first between the low-cost local-first path and the open-source-on-AWS path, then refactor `ingest.py` into modality-aware normalization, emit the shared normalized JSON contracts, and upgrade embeddings/reranking before changing answer synthesis or UI behavior.

### 2026-05-30 - README Path And Corpus Clarification

- Context: The repo docs had drifted from the working tree after `step_by_step_procedure.md` moved under `research/` and the official data pack coexisted with duplicated top-level copies under `Data/`.
- Actions: Updated `README.md` so agent instructions now point to `research/step_by_step_procedure.md` and explicitly mark `Data/SIX_Hack_Zurich-main/` as the canonical official corpus.
- Changes made: Canonical path references were aligned with the current repo layout; duplicated top-level files under `Data/` are now documented as non-canonical legacy copies for future work and scripts.
- Risks / open questions: The duplicate files still exist physically under `Data/`, so code and scripts can still target them incorrectly until the repo layout itself is cleaned up.
- Next agent: When reading challenge material or writing scripts, use `research/step_by_step_procedure.md` and `Data/SIX_Hack_Zurich-main/` unless there is a specific reason to inspect the legacy duplicates.

### 2026-05-30 - Backend Familiarization Pass

- Context: Reviewed the newly added Streamlit/LangChain backend after the RAG prototype commit to look for overlap and cleanup risks in a shared 4-coder workflow.
- Actions: Read `app.py`, `rag_engine.py`, `ingest.py`, `requirements.txt`, git history, repo state, and current planning-doc diffs.
- Changes made: No backend code changes; only this handoff entry was added.
- Risks / open questions: `ingest.py` uses `DATA_DIR = "data"` while the repo currently has `Data/`; the latest commit duplicated the official files at `Data/` and `Data/SIX_Hack_Zurich-main/`; retrieval expects `chroma_db/` to exist but it is gitignored and not present; role/freshness metadata is synthetic/random; Streamlit role selection is display-only and not enforced in retrieval; `group_idea_research.md` and `step_by_step_procedure.md` already have uncommitted edits from another agent.
- Next agent: Decide whether the backend should be repaired in-place for the current Streamlit demo or replaced by the planned `backend/` API structure before doing larger cleanup.

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
