"""Shared ingestion utilities: extract, chunk, and append documents to the brain."""

from __future__ import annotations

import os
import random
import datetime
import tempfile
import fitz  # PyMuPDF
from docx import Document as DocxDocument
from openpyxl import load_workbook

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
except ModuleNotFoundError:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

import graph_engine

DATA_DIR = os.getenv("COMPANY_BRAIN_DATA_DIR", "data")
CHROMA_DIR = os.getenv("COMPANY_BRAIN_CHROMA_DIR", "chroma_db")
COLLECTION_NAME = "company_brain"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

ROLE_OWNERS = ["ESG Compliance", "Master Data Ops", "Tax Team"]

ROLE_KEYWORDS = {
    "ESG Compliance": ["esg", "sfdr", "taxonomy"],
    "Tax Team": ["fatca", "tax"],
    "Master Data Ops": ["master", "mifid", "mifir", "data", "emt", "attribute"],
}


def assign_role_owner(filename: str) -> str:
    name = filename.lower()
    for role, keywords in ROLE_KEYWORDS.items():
        if any(k in name for k in keywords):
            return role
    return random.choice(ROLE_OWNERS)


def today_iso() -> str:
    return datetime.date.today().isoformat()


def read_pdf(path: str) -> str:
    text_parts = []
    with fitz.open(path) as doc:
        for page in doc:
            text_parts.append(page.get_text())
    return "\n".join(text_parts)


def read_docx(path: str) -> str:
    doc = DocxDocument(path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def read_xlsx(path: str) -> str:
    wb = load_workbook(path, read_only=True, data_only=True)
    rows_text = []
    for ws in wb.worksheets:
        rows_text.append(f"# Sheet: {ws.title}")
        for row in ws.iter_rows(values_only=True):
            cells = [str(c) for c in row if c is not None]
            if cells:
                rows_text.append(" | ".join(cells))
    wb.close()
    return "\n".join(rows_text)


def read_txt(path: str) -> str:
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()


def extract_text(path: str) -> str:
    try:
        text = read_pdf(path)
        if text.strip():
            return text
    except Exception:
        pass

    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".txt":
            return read_txt(path)
        if ext == ".docx":
            return read_docx(path)
        if ext in (".xlsx", ".xlsm"):
            return read_xlsx(path)
    except Exception:
        return ""
    return ""


def get_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )


def file_to_documents(
    path: str,
    filename: str | None = None,
    role_owner: str | None = None,
    last_updated: str | None = None,
) -> list[Document]:
    """Parse a file on disk into chunked LangChain Documents."""
    filename = filename or os.path.basename(path)
    text = extract_text(path)
    if not text.strip():
        return []

    role_owner = role_owner or assign_role_owner(filename)
    last_updated = last_updated or today_iso()
    splitter = get_splitter()

    return [
        Document(
            page_content=chunk,
            metadata={
                "source_file": filename,
                "role_owner": role_owner,
                "last_updated": last_updated,
            },
        )
        for chunk in splitter.split_text(text)
    ]


def get_chroma_store() -> Chroma:
    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )


def _remove_existing_chunks(store: Chroma, source_file: str) -> None:
    """Delete prior chunks for this filename so re-upload replaces rather than duplicates."""
    try:
        store.delete(where={"source_file": source_file})
    except Exception:
        pass


def add_file_to_brain(
    file_bytes: bytes,
    filename: str,
    role_owner: str | None = None,
    save_to_data_dir: bool = True,
) -> dict:
    """
    Ingest an uploaded file: save to data/, chunk, embed into Chroma, update graph.

    Returns a summary dict for the UI.
    """
    os.makedirs(DATA_DIR, exist_ok=True)

    dest_path = os.path.join(DATA_DIR, filename)
    if save_to_data_dir:
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
        parse_path = dest_path
    else:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(filename)[1]
        ) as tmp:
            tmp.write(file_bytes)
            parse_path = tmp.name

    try:
        docs = file_to_documents(parse_path, filename=filename, role_owner=role_owner)
    finally:
        if not save_to_data_dir:
            os.unlink(parse_path)

    if not docs:
        return {
            "ok": False,
            "filename": filename,
            "error": "Could not extract text from this file.",
        }

    store = get_chroma_store()
    _remove_existing_chunks(store, filename)
    store.add_documents(docs)

    graph = graph_engine.load_graph() or {
        "documents": {},
        "entities": {},
        "roles": {},
    }
    chunk_texts = [d.page_content for d in docs]
    role = docs[0].metadata["role_owner"]
    graph = graph_engine.merge_document(graph, filename, role, chunk_texts)
    graph_engine.save_graph(graph)

    return {
        "ok": True,
        "filename": filename,
        "chunks": len(docs),
        "role_owner": role,
        "entities": graph["documents"].get(filename, {}).get("entities", []),
    }
