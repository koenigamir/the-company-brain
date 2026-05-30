"""FastAPI wrapper around the existing Company Brain GraphRAG runtime."""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

import graph_engine


app = FastAPI(title="Company Brain GraphRAG API")

DATA_DIR = os.getenv("COMPANY_BRAIN_DATA_DIR", "data")
CHROMA_DIR = os.getenv("COMPANY_BRAIN_CHROMA_DIR", "chroma_db")
COLLECTION_NAME = "company_brain"


class HealthResponse(BaseModel):
    ok: bool
    data_dir: str
    chroma_dir: str
    graph_path: str
    data_dir_exists: bool
    chroma_dir_exists: bool
    graph_exists: bool
    collection_name: str


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        ok=True,
        data_dir=DATA_DIR,
        chroma_dir=CHROMA_DIR,
        graph_path=graph_engine.GRAPH_PATH,
        data_dir_exists=os.path.isdir(DATA_DIR),
        chroma_dir_exists=os.path.isdir(CHROMA_DIR),
        graph_exists=os.path.isfile(graph_engine.GRAPH_PATH),
        collection_name=COLLECTION_NAME,
    )


@app.post("/query")
def query(request: QueryRequest) -> dict[str, Any]:
    try:
        import rag_engine

        return rag_engine.query_brain(request.question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    role_owner: str | None = Form(default=None),
) -> dict[str, Any]:
    try:
        import rag_engine

        file_bytes = await file.read()
        return rag_engine.add_file_to_brain(
            file_bytes,
            file.filename or "uploaded-file",
            role_owner=role_owner or None,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
