from collections import Counter
from typing import List, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langchain_anthropic import ChatAnthropic
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate

import graph_engine
import knowledge_ops

load_dotenv()

CHROMA_DIR = knowledge_ops.CHROMA_DIR
COLLECTION_NAME = knowledge_ops.COLLECTION_NAME
EMBED_MODEL = knowledge_ops.EMBED_MODEL
LLM_MODEL = "claude-sonnet-4-6"

VALID_ROLES = knowledge_ops.ROLE_OWNERS
DEFAULT_ROLE = "Master Data Ops"

# Map graph entities to owning teams (used as routing signal for gaps).
ENTITY_TO_ROLE = {
    "SFDR": "ESG Compliance",
    "EU Taxonomy / ESG": "ESG Compliance",
    "EET Template": "ESG Compliance",
    "MiFID II": "Master Data Ops",
    "MiFIR": "Master Data Ops",
    "EMT Template": "Master Data Ops",
    "Reference Data": "Master Data Ops",
    "Product Coverage": "Master Data Ops",
    "FATCA": "Tax Team",
    "Tax Reporting": "Tax Team",
}


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


class GapRouting(BaseModel):
    routed_to: str = Field(
        description="One of: ESG Compliance, Master Data Ops, Tax Team."
    )
    reason: str = Field(
        description="One sentence explaining why this team owns the gap."
    )
    routing_confidence: str = Field(
        description="High, Medium, or Low confidence in this routing decision."
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
"""

GAP_ROUTING_PROMPT = """You route unanswered knowledge gaps to the responsible team \
at a financial regulatory-data company.

Teams and domains:
- ESG Compliance: SFDR, ESG, EU taxonomy, EET templates, sustainability disclosures
- Master Data Ops: MiFID, MiFIR, reference data, master data, EMT templates, instrument attributes, product coverage
- Tax Team: FATCA, tax reporting, withholding, tax navigator

The corpus did NOT contain a verified answer. Choose the ONE team most likely to \
own the missing knowledge.

Rules:
1. Prefer topics and entities in the QUESTION over irrelevant retrieved chunks.
2. Use chunk role_owner counts as a secondary signal when the question is domain-specific.
3. If the question is clearly unrelated to all regulatory domains (HR, office policy, IT, general admin),
   route to Master Data Ops as default intake with routing_confidence "Low".
4. routed_to must be exactly one of: ESG Compliance, Master Data Ops, Tax Team.
"""

_llm = ChatAnthropic(model=LLM_MODEL, temperature=0, max_tokens=3000)
_structured_llm = _llm.with_structured_output(WikiPage)
_gap_llm = _llm.with_structured_output(GapRouting)

_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        ("human", "Question:\n{question}\n\nContext chunks:\n{context}"),
    ]
)

_gap_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", GAP_ROUTING_PROMPT),
        (
            "human",
            "Question:\n{question}\n\n"
            "Entities detected in question: {entities_detected}\n"
            "Suggested role from question entities: {entity_suggested_role}\n"
            "Chunk role_owner counts: {chunk_role_counts}\n"
            "Most common chunk owner: {max_chunk_role}\n\n"
            "Retrieved chunks (may be irrelevant to the question):\n{context}",
        ),
    ]
)


_store = None
_graph = None


def reset_caches():
    """Call after incremental ingest so the next query sees fresh data."""
    global _store, _graph
    _store = None
    _graph = None


def _get_store():
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


def add_file_to_brain(
    file_bytes: bytes,
    filename: str,
    role_owner: Optional[str] = None,
) -> dict:
    """Ingest an uploaded file into Chroma + graph; invalidate query caches."""
    result = knowledge_ops.add_file_to_brain(
        file_bytes, filename, role_owner=role_owner
    )
    if result.get("ok"):
        reset_caches()
    return result


def _dedupe(docs, limit):
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


def _role_counts_from_entities(entities: list) -> Counter:
    return Counter(ENTITY_TO_ROLE.get(e, DEFAULT_ROLE) for e in entities)


def _suggest_role_from_signals(question: str, docs) -> dict:
    """Deterministic routing hints passed into the structured gap router."""
    entities = graph_engine.detect_entities(question)
    entity_counts = _role_counts_from_entities(entities)
    chunk_counts = Counter(d.metadata.get("role_owner", DEFAULT_ROLE) for d in docs)

    entity_suggested = (
        entity_counts.most_common(1)[0][0] if entity_counts else "none"
    )
    max_chunk_role = chunk_counts.most_common(1)[0][0] if chunk_counts else "none"

    return {
        "entities_detected": entities,
        "entity_role_counts": dict(entity_counts),
        "entity_suggested_role": entity_suggested,
        "chunk_role_counts": dict(chunk_counts),
        "max_chunk_role": max_chunk_role,
    }


def route_gap(question: str, docs, graph_debug: dict) -> dict:
    """Structured gap router: question + retrieved docs -> owning team."""
    signals = _suggest_role_from_signals(question, docs)
    context = _format_context(docs[:5])

    routing: GapRouting = (_gap_prompt | _gap_llm).invoke(
        {
            "question": question,
            "context": context,
            "entities_detected": signals["entities_detected"],
            "entity_suggested_role": signals["entity_suggested_role"],
            "chunk_role_counts": signals["chunk_role_counts"],
            "max_chunk_role": signals["max_chunk_role"],
        }
    )

    out = routing.model_dump()
    if out["routed_to"] not in VALID_ROLES:
        out["routed_to"] = signals["entity_suggested_role"] if signals["entity_role_counts"] else (
            signals["max_chunk_role"] if signals["chunk_role_counts"] else DEFAULT_ROLE
        )
        if out["routed_to"] not in VALID_ROLES:
            out["routed_to"] = DEFAULT_ROLE

    out["signals"] = signals
    out["graph_entities"] = graph_debug.get("entities_detected", [])
    return out


def hybrid_retrieve(question, k_vector=5, k_graph=6, max_context=10):
    store = _get_store()
    graph = _get_graph()

    seed = store.similarity_search(question, k=k_vector)
    seed_files = {d.metadata.get("source_file") for d in seed}

    detected = graph_engine.detect_entities(question)
    expanded = graph_engine.expand_entities(detected)
    candidate_files = graph_engine.documents_for_entities(graph, expanded)

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
    docs, graph_debug = hybrid_retrieve(question)

    if not docs:
        gap = route_gap(question, [], graph_debug)
        return {
            "title": "No Results",
            "summary": "No indexed knowledge was found for this query.",
            "confidence": "Low",
            "sources": [],
            "role_owner": gap["routed_to"],
            "last_updated_dates": [],
            "graph": graph_debug,
            "gap_routing": gap,
        }

    context = _format_context(docs)
    result: WikiPage = (_prompt | _structured_llm).invoke(
        {"question": question, "context": context}
    )

    last_updated_dates = sorted(
        {d.metadata.get("last_updated") for d in docs if d.metadata.get("last_updated")}
    )

    out = result.model_dump()
    out["last_updated_dates"] = last_updated_dates
    if not out.get("role_owner"):
        out["role_owner"] = docs[0].metadata.get("role_owner", DEFAULT_ROLE)
    out["graph"] = graph_debug

    if out.get("confidence") == "Low":
        gap = route_gap(question, docs, graph_debug)
        out["gap_routing"] = gap
        out["role_owner"] = gap["routed_to"]

    return out
