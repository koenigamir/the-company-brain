# Developer Environment

Use this as the handoff for the four developers working on the AWS backend, Streamlit demo, and Next.js/Vercel migration.

## What Exists Now

The current production-like backend is FastAPI on ECS Fargate. It wraps the current GraphRAG runtime:

```text
frontend client
  -> HTTP API
  -> FastAPI backend on ECS
  -> Chroma vector store + graph.json + localstore on EFS
  -> Claude Sonnet 4.6 through Anthropic
```

The backend now supports document, image, audio, and video ingest. Images use Claude vision OCR/description; audio/video use local `faster-whisper` with optional cloud escalation. Roles, document ownership, and gap tickets persist to local JSON by default or Supabase when explicitly enabled.

The backend service is normally stopped (`desired-count = 0`) unless somebody is testing.

## One-Time Local Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` locally only:

```bash
cp .env.example .env
```

Put only app secrets in `.env`, such as:

```text
ANTHROPIC_API_KEY=...
```

For AWS-compatible local runs, the important runtime paths are:

```text
COMPANY_BRAIN_DATA_DIR=data
COMPANY_BRAIN_CHROMA_DIR=chroma_db
COMPANY_BRAIN_GRAPH_PATH=graph.json
COMPANY_BRAIN_STORE_DIR=localstore
```

Do not commit `.env`. AWS credentials should be configured through the local AWS profile `company-brain`, not through `.env`.

## Backend Developer Workflow

```bash
./scripts/aws_backend.sh start
./scripts/aws_backend.sh health
BACKEND_URL="$(./scripts/aws_backend.sh url)"
```

Run Streamlit against AWS:

```bash
COMPANY_BRAIN_API_URL="$BACKEND_URL" streamlit run app.py
```

Stop AWS compute when done:

```bash
./scripts/aws_backend.sh stop
```

## Next.js / Vercel Developer Workflow

The migration starter lives in `frontend-next/`.

```bash
cd frontend-next
cp .env.local.example .env.local
```

Set:

```text
COMPANY_BRAIN_API_URL=http://x.x.x.x:8000
```

Then:

```bash
nvm use
npm install
npm run dev
```

The Next.js app calls its own API routes under `/api/company-brain/*`. Those server routes proxy to the AWS backend, so the backend URL remains a server-side env var.

Use Node 22 LTS for local frontend work and Vercel parity. If `npm run typecheck` or `npm run build` hangs locally, remove generated artifacts and reinstall under Node 22:

```bash
rm -rf node_modules .next tsconfig.tsbuildinfo
nvm use
npm install
```

For Vercel, set project root to `frontend-next` and configure the `COMPANY_BRAIN_API_URL` environment variable in Vercel. Do not use `NEXT_PUBLIC_` for the backend URL unless the backend is intentionally public and stable.

## Suggested Developer Split

- Developer 1: Next.js query UI and answer/source rendering.
- Developer 2: Upload/ingest UI and SME gap flow.
- Developer 3: Backend hardening: auth, CORS, ALB/HTTPS, stable URL.
- Developer 4: Retrieval/governance: access control, metadata quality, tests.

## Verification Commands

Run from repo root:

```bash
python3 -m unittest discover -s tests
PYTHONPYCACHEPREFIX=/tmp/company-brain-pycache python3 -m py_compile app.py api_client.py rag_engine.py graph_engine.py knowledge_ops.py ingest.py backend/api.py store.py role_resolver.py media_ingest.py image_ingest.py
rg -n "sk-ant-api|AKIA|AWS_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID" --glob '!Data/**' --glob '!chroma_db/**' --glob '!data/**' --glob '!.env' --glob '!.venv/**' .
```
