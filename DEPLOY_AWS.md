# Deploy Company Brain (GraphRAG) on AWS

This branch adds **Tier 1 GraphRAG**: hybrid retrieval (vector + knowledge graph) on top of the existing Streamlit RAG app.

## What's new on this branch

| File | Purpose |
|------|---------|
| `graph_engine.py` | Domain ontology, graph build/load, entity detection, 1-hop expansion |
| `graph.json` | Generated at ingest (gitignored); rebuild with `python ingest.py` |
| `rag_engine.py` | `hybrid_retrieve()` merges vector seed + graph-linked chunks |
| `app.py` | Shows graph path, cross-document files, GraphRAG badge in UI |

## Prerequisites

- Python 3.9+
- `ANTHROPIC_API_KEY` in `.env`
- ~2 GB RAM (local embedding model + Chroma)

## Local setup (verify before AWS)

```bash
git checkout feature/tier1-graphrag
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env → ANTHROPIC_API_KEY=sk-ant-...

python ingest.py          # builds chroma_db/ + graph.json (~5–10 min first run)
streamlit run app.py      # http://localhost:8501
```

**Demo questions that show GraphRAG vs vector-only:**

- *What data templates support SFDR and who maintains them?* → check **GraphRAG: cross-document context used**
- *How do FATCA and the tax navigator relate?*
- *What is FATCA?* → control (vector-only is fine)

## Option A: AWS App Runner (simplest for Streamlit)

1. **Dockerfile** (add to repo root):

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Pre-build index at image build time (optional; increases image size but faster cold start)
# RUN python ingest.py
EXPOSE 8501
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0", "--server.headless=true"]
```

2. Push image to **ECR**, create **App Runner** service from the image.
3. Set env var `ANTHROPIC_API_KEY` in App Runner configuration.
4. On first deploy, either:
   - Run `ingest.py` in the Dockerfile (bakes `chroma_db/` + `graph.json` into image), or
   - Mount **EFS** for persistent `chroma_db/` and run ingest once via ECS task / startup script.

**Note:** Ingest downloads `sentence-transformers/all-MiniLM-L6-v2` and embeds ~5k chunks — do this at **build time** or on a persistent volume, not on every container restart.

## Option B: EC2 (quick hackathon path)

```bash
# On Ubuntu EC2 (t3.medium or larger)
sudo apt update && sudo apt install -y python3-venv git
git clone https://github.com/koenigamir/the-company-brain.git
cd the-company-brain
git checkout feature/tier1-graphrag

python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "ANTHROPIC_API_KEY=..." > .env
python ingest.py

nohup .venv/bin/streamlit run app.py --server.port 8501 --server.address 0.0.0.0 &
```

Open security group port **8501** (or put **nginx** + HTTPS in front).

## Option C: ECS Fargate

Same Dockerfile as App Runner. Store secrets in **AWS Secrets Manager** (`ANTHROPIC_API_KEY`). Use EFS mount for `/app/chroma_db` and `/app/graph.json` so re-ingest isn't required on every task restart.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude synthesis (`claude-sonnet-4-6`) |

Embeddings are **local** (HuggingFace `all-MiniLM-L6-v2`) — no extra API key.

## Generated artifacts (do not commit)

- `chroma_db/` — vector store
- `graph.json` — knowledge graph (rebuilt by `ingest.py`)
- `.env` — secrets

Both are in `.gitignore`. Teammates must run `python ingest.py` after clone unless you bake them into a Docker image.

## Architecture recap

```
ingest.py  →  chroma_db/ (vectors)  +  graph.json (entity ↔ document links)
app.py     →  rag_engine.query_brain()
rag_engine →  vector seed (k=5) + graph expansion (k=6 from new docs) → Claude
graph_engine → detect_entities(question) → expand 1 hop → documents_for_entities()
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `graph.json` not found | Run `python ingest.py` |
| Empty graph panel | Question has no known entities (SFDR, FATCA, MiFID, EET, EMT, …) |
| Slow first query | Embedding model cold load; subsequent queries faster |
| OOM on small instance | Use `t3.medium`+ or pre-bake index in Docker build |
