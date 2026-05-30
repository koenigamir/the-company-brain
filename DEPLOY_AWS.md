# Deploy Company Brain (GraphRAG) on AWS

This branch adds **Tier 1 GraphRAG** plus multimodal ingestion behind a FastAPI backend. Streamlit remains the demo UI and can either call the backend over HTTP or run the GraphRAG code in-process for quick local testing.

## Current Status

These notes describe the branch's intended deployment shape, not a fully validated clean-room deployment recipe. The default AWS path is **ECS Fargate + EFS** so generated GraphRAG artifacts survive task restarts.

Current branch caveats:

- the GraphRAG code path defaults to lowercase `data/`, but can be pointed elsewhere with `COMPANY_BRAIN_DATA_DIR`,
- the canonical official challenge corpus is `Data/SIX_Hack_Zurich-main/`,
- top-level `Data/*` files are intentionally minimal; the branch has a few demo additions there, but the canonical official corpus remains the nested folder.

If you are testing on a clean Linux or AWS environment, set the corpus/artifact environment variables explicitly before treating the deploy flow below as production-ready.

## What's new on this branch

| File | Purpose |
|------|---------|
| `graph_engine.py` | Domain ontology, graph build/load, entity detection, 1-hop expansion |
| `knowledge_ops.py` | Shared extraction, chunking, incremental ingest, and graph-update utilities |
| `media_ingest.py` | Audio/video transcription using local `faster-whisper` with optional cloud escalation |
| `image_ingest.py` | Vision OCR/description extraction for screenshots and images |
| `role_resolver.py` | Dynamic role assignment constrained to the SIX role catalog |
| `store.py` | Local JSON or optional Supabase persistence for roles, documents, and gap tickets |
| `supabase_schema.sql` | Optional Supabase schema for shared role/document/gap-ticket persistence |
| `backend/api.py` | FastAPI backend exposing health, query, and ingest endpoints |
| `api_client.py` | Streamlit HTTP client helpers for backend mode |
| `Dockerfile.backend` | Backend container image definition for ECS/Fargate |
| `buildspec.backend.yml` | AWS CodeBuild recipe for building/pushing the backend image |
| `scripts/aws_backend.sh` | Helper for backend status/start/stop/url/health |
| `frontend-next/` | Next.js/Vercel migration starter that proxies to the backend |
| `graph.json` | Generated at ingest (gitignored); rebuild with `python ingest.py` |
| `rag_engine.py` | `hybrid_retrieve()` merges vector seed + graph-linked chunks |
| `app.py` | Streamlit UI; calls backend when `COMPANY_BRAIN_API_URL` is set |

## Prerequisites

- Python 3.9+
- `ANTHROPIC_API_KEY` in `.env`
- ~2 GB RAM (local embedding model + Chroma)
- `ffmpeg` for local audio/video ingestion
- Rotate any access keys that were pasted into chat or docs before deploying.

## Local setup (verify before AWS)

```bash
git checkout codex/aws-backend-graphrag
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env → ANTHROPIC_API_KEY=sk-ant-...

python ingest.py          # builds chroma_db/ + graph.json (~5–10 min first run)
uvicorn backend.api:app --host 0.0.0.0 --port 8000
```

In another terminal:

```bash
source .venv/bin/activate
COMPANY_BRAIN_API_URL=http://localhost:8000 streamlit run app.py
```

## AWS Developer Commands

The deployed backend is intentionally scaled to zero when nobody is testing.

```bash
./scripts/aws_backend.sh status
./scripts/aws_backend.sh start
./scripts/aws_backend.sh url
./scripts/aws_backend.sh health
./scripts/aws_backend.sh stop
```

Use `start` before a demo or remote frontend test, then `stop` when done. The public task IP changes across restarts.

**Demo questions that show GraphRAG vs vector-only:**

- *What data templates support SFDR and who maintains them?* → check **GraphRAG: cross-document context used**
- *How do FATCA and the tax navigator relate?*
- *What is FATCA?* → control (vector-only is fine)

## Backend API

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Returns artifact paths and whether `data`, `chroma_db`, and `graph.json` exist |
| `POST` | `/query` | Body: `{"question": "...", "history": []}`. Returns the GraphRAG answer shape |
| `POST` | `/ingest` | Multipart `file` plus optional `role_owner`. Adds documents, media, or images to Chroma and graph |
| `GET` | `/roles` | Returns dynamic role names and persistence backend |
| `GET` | `/documents` | Returns persisted document ownership/freshness metadata |
| `POST` | `/gap-ticket` | Persists reviewed knowledge-gap tickets |

## AWS ECS Fargate + EFS

1. Build and push `Dockerfile.backend` to ECR. The current branch uses AWS CodeBuild with `buildspec.backend.yml` because local Docker may be unavailable or unhealthy.
2. Create an EFS filesystem and mount it into the task, for example at `/mnt/company-brain`.
3. Configure the ECS task environment:
   - `ANTHROPIC_API_KEY` from AWS Secrets Manager or task secrets.
   - `COMPANY_BRAIN_DATA_DIR=/mnt/company-brain/data`
   - `COMPANY_BRAIN_CHROMA_DIR=/mnt/company-brain/chroma_db`
   - `COMPANY_BRAIN_GRAPH_PATH=/mnt/company-brain/graph.json`
   - `COMPANY_BRAIN_STORE_DIR=/mnt/company-brain/localstore`
4. Run ingestion once against the mounted paths. This can be a one-off ECS task using the same image with command `python ingest.py`, or a local run that syncs artifacts to EFS.
5. Run the backend service on port `8000` behind an internal or restricted load balancer.
6. Run Streamlit locally or separately with `COMPANY_BRAIN_API_URL` pointing at the backend URL.
7. For Next.js/Vercel, use `frontend-next/` as the Vercel project root and set `COMPANY_BRAIN_API_URL` in Vercel environment variables.

**Note:** Ingest downloads `sentence-transformers/all-MiniLM-L6-v2` and embeds the corpus. Do this once against persistent storage, not on every container restart.

## EC2 fallback

```bash
# On Ubuntu EC2 (t3.medium or larger)
sudo apt update && sudo apt install -y python3-venv git
git clone https://github.com/koenigamir/the-company-brain.git
cd the-company-brain
git checkout codex/aws-backend-graphrag

python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "ANTHROPIC_API_KEY=..." > .env
python ingest.py

nohup .venv/bin/uvicorn backend.api:app --host 0.0.0.0 --port 8000 &
```

Open only the required backend port to trusted clients, or put nginx / ALB + HTTPS in front.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude synthesis (`claude-sonnet-4-6`) |
| `COMPANY_BRAIN_API_URL` | Streamlit backend mode only | Backend base URL, e.g. `http://localhost:8000` |
| `COMPANY_BRAIN_DATA_DIR` | No | Upload/corpus directory; defaults to `data` |
| `COMPANY_BRAIN_CHROMA_DIR` | No | Chroma vector store directory; defaults to `chroma_db` |
| `COMPANY_BRAIN_GRAPH_PATH` | No | Knowledge graph JSON path; defaults to `graph.json` |
| `COMPANY_BRAIN_STORE_DIR` | No | Local JSON persistence directory; defaults to `localstore` |
| `VISION_MODEL` | No | Claude vision model for image ingestion; defaults to `claude-sonnet-4-6` |
| `WHISPER_MODEL` | No | Local faster-whisper model for media ingestion; defaults to `small` |
| `TRANSCRIBE_MIN_CONF` | No | Confidence threshold before optional cloud transcription escalation |
| `SUPABASE_ENABLED`, `SUPABASE_URL`, `SUPABASE_KEY` | No | Optional remote persistence instead of local JSON |

Embeddings are **local** (HuggingFace `all-MiniLM-L6-v2`) — no extra API key.

## Generated artifacts (do not commit)

- `chroma_db/` — vector store
- `graph.json` — knowledge graph (rebuilt by `ingest.py`)
- `data/` — local uploaded files when using incremental ingest
- `localstore/` — local JSON roles, document records, and gap tickets
- `.env` — secrets

Both are in `.gitignore`. Teammates must run `python ingest.py` after clone unless you bake them into a Docker image.

## Architecture recap

```
ingest.py      →  chroma_db/ (vectors) + graph.json (entity ↔ document links)
media_ingest   →  audio/video transcript chunks
image_ingest   →  image OCR/description chunks
role_resolver  →  catalog-constrained owner assignment
store.py       →  local JSON or Supabase roles/documents/gap tickets
backend/api.py →  rag_engine.query_brain() / rag_engine.add_file_to_brain()
app.py         →  backend HTTP API when COMPANY_BRAIN_API_URL is set
rag_engine     →  vector seed + graph expansion + literal-token retrieval → Claude
graph_engine   →  detect_entities(question) → expand 1 hop → documents_for_entities()
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `graph.json` not found | Run `python ingest.py` |
| Streamlit still runs locally | Check that `COMPANY_BRAIN_API_URL` is exported in the Streamlit shell |
| `/health` shows missing Chroma | Run ingest against the same `COMPANY_BRAIN_CHROMA_DIR` used by the backend |
| Empty graph panel | Question has no known entities (SFDR, FATCA, MiFID, EET, EMT, …) |
| Slow first query | Embedding model cold load; subsequent queries faster |
| OOM on small instance | Use `t3.medium`+ or pre-bake index in Docker build |
| Public IP stopped working | The ECS task restarted or service is scaled to zero; run `./scripts/aws_backend.sh start` and use the new printed URL |
