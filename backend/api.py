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
VALID_CLEARANCE_LEVELS = {"intern", "standard", "senior"}


class HealthResponse(BaseModel):
    ok: bool
    data_dir: str
    chroma_dir: str
    graph_path: str
    store_dir: str | None = None
    data_dir_exists: bool
    chroma_dir_exists: bool
    graph_exists: bool
    store_dir_exists: bool | None = None
    collection_name: str


class QueryRequest(BaseModel):
    question: str = Field(min_length=1)
    history: list[dict[str, Any]] = Field(default_factory=list)
    viewer_account_id: str | None = Field(default="standard-employee")


class GapTicketRequest(BaseModel):
    question: str = Field(min_length=1)
    gap: dict[str, Any] = Field(default_factory=dict)
    body: str = ""
    missing_topics: list[str] = Field(default_factory=list)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        import store

        store_dir = store.LOCAL_DIR
    except Exception:
        store_dir = None

    return HealthResponse(
        ok=True,
        data_dir=DATA_DIR,
        chroma_dir=CHROMA_DIR,
        graph_path=graph_engine.GRAPH_PATH,
        store_dir=store_dir,
        data_dir_exists=os.path.isdir(DATA_DIR),
        chroma_dir_exists=os.path.isdir(CHROMA_DIR),
        graph_exists=os.path.isfile(graph_engine.GRAPH_PATH),
        store_dir_exists=os.path.isdir(store_dir) if store_dir else None,
        collection_name=COLLECTION_NAME,
    )


@app.post("/query")
def query(request: QueryRequest) -> dict[str, Any]:
    try:
        import rag_engine

        return rag_engine.query_brain(
            request.question,
            history=request.history,
            viewer_account_id=request.viewer_account_id or "standard-employee",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    role_owner: str | None = Form(default=None),
    visibility_roles: list[str] | None = Form(default=None),
    min_clearance: str | None = Form(default=None),
) -> dict[str, Any]:
    try:
        import rag_engine

        normalized_clearance = (min_clearance or "").strip().lower() or None
        if normalized_clearance and normalized_clearance not in VALID_CLEARANCE_LEVELS:
            raise HTTPException(
                status_code=400,
                detail="min_clearance must be one of: intern, standard, senior",
            )
        file_bytes = await file.read()
        return rag_engine.add_file_to_brain(
            file_bytes,
            file.filename or "uploaded-file",
            role_owner=role_owner or None,
            visibility_roles=visibility_roles or None,
            min_clearance=normalized_clearance,
        )
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/roles")
def roles() -> dict[str, Any]:
    try:
        import store

        return {"roles": store.role_names(), "backend": store.backend_name()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/demo-accounts")
def demo_accounts() -> dict[str, Any]:
    try:
        import store

        return {
            "accounts": store.list_demo_accounts(),
            "backend": store.backend_name(),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/documents")
def documents() -> dict[str, Any]:
    try:
        import store

        return {"documents": store.list_documents()}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/gap-ticket")
def gap_ticket(request: GapTicketRequest) -> dict[str, Any]:
    try:
        import rag_engine

        tickets = rag_engine.send_gap_ticket(
            request.question,
            request.gap,
            request.body,
            request.missing_topics,
        )
        return {"ok": True, "tickets": tickets}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
