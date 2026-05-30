# AWS Backend Runbook

This branch has a deployed FastAPI GraphRAG backend in AWS. It is intentionally scaled to zero when nobody is testing so it does not burn Fargate compute credits.

## Resource Summary

- AWS account: `669960693304`
- Region: `eu-central-1`
- AWS CLI profile: `company-brain`
- ECS cluster: `company-brain-graphrag`
- ECS service: `company-brain-graphrag-backend`
- ECR repository: `company-brain-graphrag-backend`
- EFS filesystem: `fs-0bd3875c6012c3773`
- CodeBuild project: `company-brain-graphrag-backend`
- Secrets Manager secret: `company-brain/anthropic-api-key`
- Backend model: `claude-sonnet-4-6`

The persisted GraphRAG artifacts live on EFS:

```text
/mnt/company-brain/chroma_db
/mnt/company-brain/graph.json
```

The successful AWS ingest indexed `5263` chunks from `22` documents and saved a graph with `10` entities. Normal ECS restarts do not require re-ingestion.

## Start / Stop / Status

Run all commands from the repository root.

```bash
./scripts/aws_backend.sh status
./scripts/aws_backend.sh start
./scripts/aws_backend.sh url
./scripts/aws_backend.sh health
./scripts/aws_backend.sh stop
```

`start` waits for the ECS service to stabilize and then prints a backend URL like:

```text
http://x.x.x.x:8000
```

The public IP can change whenever the service restarts. Do not hardcode it in committed code.

## Local Streamlit Against AWS

```bash
source .venv/bin/activate
BACKEND_URL="$(./scripts/aws_backend.sh url)"
COMPANY_BRAIN_API_URL="$BACKEND_URL" streamlit run app.py
```

Open Streamlit at the local URL it prints, usually:

```text
http://localhost:8501
```

## API Shape

```bash
curl "$BACKEND_URL/health"
curl -X POST "$BACKEND_URL/query" \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is FATCA?"}'
```

Routes:

- `GET /health`
- `POST /query` with JSON body `{"question": "..."}`
- `POST /ingest` with multipart `file` and optional `role_owner`

## Cost Control

Keep the ECS service at desired count `0` when nobody is using it. EFS, ECR, logs, and Secrets Manager stay in place, but the expensive always-on compute stops.

Current demo security caveat: the backend is direct HTTP on port `8000` when running. Before non-demo use, put it behind an ALB, HTTPS, auth, and restricted security group rules.
