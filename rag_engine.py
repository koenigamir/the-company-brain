import os
from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langchain_aws import ChatBedrock
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate

import graph_engine

print("--- RAG ENGINE (AWS) LOADED ---")

load_dotenv()

CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "company_brain"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
BEDROCK_MODEL_ID = "eu.amazon.nova-lite-v1:0"
REGION = os.getenv("AWS_REGION", "eu-central-1")


class WikiPage(BaseModel):
    title: str = Field(description="Title of the wiki page.")
    summary: str = Field(
        description="Definitive, encyclopedic summary answering the query "
        "using ONLY the provided context."
    )
    confidence: str = Field(
        description="One of 'High', 'Medium', or 'Low' based on how well the "
        "retrieved chunks answer the query."
    )
    sources: List[str] = Field(description="List of source filenames used.")
    role_owner: str = Field(
        description="The role owner from the most relevant chunk's metadata."
    )


SYSTEM_PROMPT = """You are an objective compliance knowledge-base synthesizer \
for a financial regulatory-data company. Produce a single canonical wiki page \
answering the user's question.

Strict rules:
- Base your answer ONLY on the provided context chunks. Never use outside knowledge.
- If the chunks clearly and fully answer the question, set confidence to "High".
- If they partially answer it, set confidence to "Medium".
- If the chunks do NOT contain the answer, set confidence to "Low" and keep the
  summary brief (one sentence stating the information is not available).
- 'sources' must list the distinct source_file values you actually used.
- 'role_owner' must come from the most relevant chunk's metadata.

Target Output Quality:
- Your goal is to produce a HIGHLY DETAILED, PROFESSIONAL, and LONG encyclopedic entry.
- Use Markdown headers (###), bold text, and tables to organize information.
- Provide in-depth explanations of concepts (e.g., explaining exactly what a template is or how a regulation works based on the text).
- Include specific field names, version numbers, and regulatory references found in the context.
- Structure the response with an Introduction, Key Components/Sections, and a 'How it Supports/Relates to [Regulation]' section.
- Aim for a comprehensive length (300-600 words) if the context allows.
"""

# Use Bedrock instead of Anthropic API
_llm = ChatBedrock(
    model_id=BEDROCK_MODEL_ID,
    region_name=REGION,
    model_kwargs={"temperature": 0},
)
_structured_llm = _llm.with_structured_output(WikiPage)

_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        ("human", "Question:\n{question}\n\nContext chunks:\n{context}"),
    ]
)


_store = None
_graph = None


def _get_store():
    """Lazily build and cache the Chroma store (avoids reloading the embedding
    model on every query)."""
    global _store
    if _store is None:
        embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
        _store = Chroma(
            collection_name=COLLECTION_NAME,
            embedding_function=embeddings,
            persist_directory=CHROMA_DIR,
        )
    return _store


def _get_graph():
    global _graph
    if _graph is None:
        _graph = graph_engine.load_graph()
    return _graph


def _dedupe(docs, limit):
    """Deduplicate by (source_file, content prefix), preserving order."""
    seen = set()
    out = []
    for d in docs:
        key = (d.metadata.get("source_file"), d.page_content[:80])
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
        if len(out) >= limit:
            break
    return out


def hybrid_retrieve(question, k_vector=5, k_graph=6, max_context=10):
    """
    GraphRAG (Tier 1) retrieval:
      1. Vector search for the most semantically similar chunks (seed).
      2. Detect entities in the question and expand one hop via the graph.
      3. Pull the most relevant chunks from graph-linked documents.
      4. Merge + dedupe so the LLM sees cross-document context.

    Returns (context_docs, debug) where debug describes the graph path used.
    """
    store = _get_store()
    graph = _get_graph()

    seed = store.similarity_search(question, k=k_vector)
    seed_files = {d.metadata.get("source_file") for d in seed}

    detected = graph_engine.detect_entities(question)
    expanded = graph_engine.expand_entities(detected)
    candidate_files = graph_engine.documents_for_entities(graph, expanded)

    # Cross-context is only useful when the graph surfaces RELATED documents the
    # vector seed did not already find. Restrict the graph search to those.
    new_files = [f for f in candidate_files if f not in seed_files]

    graph_hits = []
    if new_files:
        graph_hits = store.similarity_search(
            question,
            k=k_graph,
            filter={"source_file": {"$in": new_files}},
        )

    merged = _dedupe(seed + graph_hits, max_context)

    added_files = sorted(
        {d.metadata.get("source_file") for d in graph_hits} - seed_files
    )
    debug = {
        "entities_detected": detected,
        "entities_expanded": [e for e in expanded if e not in detected],
        "relation_paths": graph_engine.relation_paths(expanded),
        "graph_added_files": added_files,
        "used_graph": bool(detected) and bool(added_files),
    }
    return merged, debug


def _format_context(docs) -> str:
    blocks = []
    for i, d in enumerate(docs, 1):
        m = d.metadata
        blocks.append(
            f"[Chunk {i}] source_file={m.get('source_file')} | "
            f"role_owner={m.get('role_owner')} | "
            f"last_updated={m.get('last_updated')}\n{d.page_content}"
        )
    return "\n\n".join(blocks)


def query_brain(question: str) -> dict:
    """Retrieve, synthesize, and return a structured wiki page + raw metadata."""
    print(f"QUERY RECEIVED: {question}")
    docs, graph_debug = hybrid_retrieve(question)
    print(f"RETRIEVED {len(docs)} DOCS")

    if not docs:
        print("CONFIDENCE: LOW (No docs)")
        return {
            "title": "No Results",
            "summary": "No indexed knowledge was found for this query.",
            "confidence": "Low",
            "sources": [],
            "role_owner": "Master Data Ops",
            "last_updated_dates": [],
            "graph": graph_debug,
        }

    context = _format_context(docs)
    result: WikiPage = (_prompt | _structured_llm).invoke(
        {"question": question, "context": context}
    )
    print(f"LLM CONFIDENCE: {result.confidence}")

    last_updated_dates = sorted(
        {d.metadata.get("last_updated") for d in docs if d.metadata.get("last_updated")}
    )

    out = result.model_dump()
    out["last_updated_dates"] = last_updated_dates
    if not out.get("role_owner"):
        out["role_owner"] = docs[0].metadata.get("role_owner", "Master Data Ops")
    out["graph"] = graph_debug
    return out
