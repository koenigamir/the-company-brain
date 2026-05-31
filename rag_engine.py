from __future__ import annotations

import datetime
import re
from collections import Counter
from typing import Dict, List, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langchain_anthropic import ChatAnthropic
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

import graph_engine
import knowledge_ops
import store

load_dotenv()

CHROMA_DIR = knowledge_ops.CHROMA_DIR
COLLECTION_NAME = knowledge_ops.COLLECTION_NAME
EMBED_MODEL = knowledge_ops.EMBED_MODEL
LLM_MODEL = "claude-sonnet-4-6"

DEFAULT_ROLE = "Master Data Ops"

# Parent-doc expansion: only pull ALL chunks when the source is small (screenshots,
# short memos). Large PDFs/XLSX only get a few extra same-file vector hits.
SMALL_FILE_MAX_CHUNKS = 8
LARGE_FILE_EXTRA_K = 3
KEYWORD_SEARCH_K = 2


def valid_roles() -> list:
    """Current owning roles (dynamic: grows as new documents add roles)."""
    try:
        return store.role_names() or knowledge_ops.ROLE_OWNERS
    except Exception:
        return knowledge_ops.ROLE_OWNERS

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
    title: str = Field(description="Short title of the wiki page / topic.")
    short_answer: str = Field(
        description="A concise, direct answer to the question. 1-3 sentences. "
        "This is ALWAYS shown first and should stand on its own."
    )
    detailed_answer: str = Field(
        default="",
        description="A longer, structured explanation. ONLY fill this when the "
        "question genuinely needs more depth than the short answer; otherwise "
        "leave it as an empty string.",
    )
    confidence: str = Field(
        description="One of 'High', 'Medium', or 'Low' based on how well the "
        "company context answers the query."
    )
    used_llm_knowledge: bool = Field(
        default=False,
        description="True if the answer relied on the model's own general "
        "knowledge beyond the provided company context.",
    )
    sources: List[str] = Field(
        description="List of company source filenames actually used. Empty if "
        "the answer is based only on general model knowledge."
    )
    role_owner: str = Field(
        description="The role owner from the most relevant chunk's metadata."
    )
    gap_required: bool = Field(
        default=False,
        description="True if ANY part of the question is not answered by the "
        "company context, even when other parts are answered. Otherwise false.",
    )
    missing_topics: List[str] = Field(
        default_factory=list,
        description="Specific sub-topics or parts of the question that the "
        "company context does NOT cover. Empty list if nothing is missing.",
    )


class GapRouting(BaseModel):
    routed_to: List[str] = Field(
        description="One or more owning roles, chosen ONLY from the provided "
        "role list. Use a SINGLE role unless the gap genuinely spans multiple "
        "domains, in which case list each relevant role (most relevant first)."
    )
    reason: str = Field(
        description="One sentence explaining why these team(s) own the gap."
    )
    routing_confidence: str = Field(
        description="High, Medium, or Low confidence in this routing decision."
    )


SYSTEM_PROMPT = """You are the knowledge assistant for SIX, a financial \
regulatory-data company. Answer the user's question as helpfully as possible.

Answering style:
- ALWAYS write a tight, direct 'short_answer' (1-3 sentences) that stands alone.
- Only fill 'detailed_answer' when the topic genuinely needs more depth
  (definitions, multi-part questions, step-by-step, nuanced regulation). If the
  short answer is enough, leave 'detailed_answer' as an empty string.
- 'detailed_answer' must use only simple Markdown:
  short paragraphs, '-' bullets, and optional '**bold**'.
- Do NOT use tables, heading markers, LaTeX/math delimiters, fenced code blocks,
  or HTML in 'detailed_answer'.

Sources and knowledge:
- PREFER the provided company context. Ground your answer in it as much as possible.
- You MAY also use your own general knowledge to supplement or fill gaps, but when
  you do, set 'used_llm_knowledge' to true.
- 'sources' must list ONLY the company source_file values you actually used.

Confidence (based on the COMPANY context only):
- "High": the company context clearly and fully answers the question.
- "Medium": the company context partially answers it (some parts missing).
- "Low": the company context does NOT cover the question. In this case answer
  from your general knowledge, set 'used_llm_knowledge' to true, and make the
  short_answer make clear this is general knowledge, not company data.

Gaps:
- Set 'gap_required' to true if ANY part of the question is not covered by the
  company context (always true when confidence is Low or Medium).
- 'missing_topics' must list the specific sub-topics, entities, or parts of the
  question the company context does not cover (e.g. "Bangladesh regulatory
  framework"). Empty list only when the company context fully covers the question.
- 'role_owner' must come from the most relevant chunk's metadata (or the most
  common role owner across the context).
"""

GAP_ROUTING_PROMPT = """You route unanswered knowledge gaps to the responsible roles \
at a financial regulatory-data company called SIX, a Swiss-based company.

Current teams / roles (name: domain):
{roles}

The company corpus is missing some or all of the answer. Choose the owning \
team(s) for the missing knowledge.

Routing precedence:
1. FIRST, route to the team most RELATED to the gap topics/entities in the QUESTION.
2. If the question is not clearly tied to one domain, fall back to the team that
   OWNS THE MOST retrieved chunks (most mentioned role_owner).
3. If still unclear (HR, office policy, IT, general admin), route to the default
   intake role with routing_confidence "Low".
4. Default to a SINGLE role. Only return MULTIPLE roles when the gap genuinely
   spans more than one domain; do not add weakly-related roles.
5. Every routed_to entry MUST be one of the role names listed above.
"""

_llm = ChatAnthropic(model=LLM_MODEL, temperature=0, max_tokens=3000)
_structured_llm = _llm.with_structured_output(WikiPage)
_gap_llm = _llm.with_structured_output(GapRouting)

_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        (
            "human",
            "Conversation so far (for follow-up context):\n{history}\n\n"
            "Current question:\n{question}\n\n"
            "Company context chunks:\n{context}",
        ),
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


def _roles_for_prompt() -> str:
    try:
        roles = store.list_roles()
    except Exception:
        roles = []
    if not roles:
        return "\n".join(f"- {r}" for r in knowledge_ops.ROLE_OWNERS)
    return "\n".join(
        f"- {r['name']}: {r.get('description', '')}" for r in roles
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
    visibility_roles: Optional[list[str]] = None,
    min_clearance: Optional[str] = None,
) -> dict:
    """Ingest an uploaded file into Chroma + graph; invalidate query caches."""
    result = knowledge_ops.add_file_to_brain(
        file_bytes,
        filename,
        role_owner=role_owner,
        visibility_roles=visibility_roles,
        min_clearance=min_clearance,
    )
    if result.get("ok"):
        reset_caches()
    return result


def _parse_date(value) -> datetime.date:
    try:
        return datetime.date.fromisoformat(value)
    except (TypeError, ValueError):
        return datetime.date.min


def _dedupe(docs, limit):
    """Collapse near-identical chunks, keeping only the latest data point.

    Documents are keyed by a content prefix (ignoring which file they came
    from) so two versions of the same passage collapse to one; among
    duplicates we keep the one with the newest ``last_updated``. First-seen
    (relevance) order is preserved.
    """
    best = {}
    order = []
    for d in docs:
        key = " ".join(d.page_content[:120].split()).lower()
        existing = best.get(key)
        if existing is None:
            best[key] = d
            order.append(key)
        elif _parse_date(d.metadata.get("last_updated")) > _parse_date(
            existing.metadata.get("last_updated")
        ):
            best[key] = d
    return [best[k] for k in order[:limit]]


def _source_catalog(graph: dict | None = None) -> Dict[str, dict]:
    """source_file -> normalized document row from store rows plus graph fallback."""
    catalog: Dict[str, dict] = {}
    try:
        for row in store.list_documents():
            source_file = row.get("source_file")
            if source_file:
                catalog[source_file] = store.normalize_document_row(row)
    except Exception:
        pass

    graph_docs = (graph or {}).get("documents", {})
    for source_file, meta in graph_docs.items():
        if source_file in catalog:
            continue
        role_owner = (meta or {}).get("role_owner")
        catalog[source_file] = store.normalize_document_row(
            {
                "source_file": source_file,
                "role_owner": role_owner,
                "role_owners": [role_owner] if role_owner else [],
            }
        )
    return catalog


def _document_row_for_source(source_file: str, catalog: dict, metadata=None) -> dict:
    row = catalog.get(source_file)
    if row is not None:
        return row
    metadata = metadata or {}
    return store.normalize_document_row(
        {
            "source_file": source_file,
            "role_owner": metadata.get("role_owner"),
            "role_owners": metadata.get("role_owners"),
            "visibility_roles": metadata.get("visibility_roles"),
            "min_clearance": metadata.get("min_clearance"),
        }
    )


def _doc_is_visible(doc: Document, viewer_account: dict, catalog: dict) -> bool:
    source_file = doc.metadata.get("source_file")
    if not source_file:
        return False
    row = _document_row_for_source(source_file, catalog, metadata=doc.metadata)
    return store.document_is_visible(row, viewer_account)


def _file_is_visible(source_file: str, viewer_account: dict, catalog: dict) -> bool:
    row = _document_row_for_source(source_file, catalog)
    return store.document_is_visible(row, viewer_account)


def _partition_docs_by_access(docs, viewer_account: dict, catalog: dict):
    allowed = []
    blocked_files = set()
    for doc in docs:
        if _doc_is_visible(doc, viewer_account, catalog):
            allowed.append(doc)
            continue
        source_file = doc.metadata.get("source_file")
        if source_file:
            blocked_files.add(source_file)
    return allowed, blocked_files


def _partition_files_by_access(files, viewer_account: dict, catalog: dict):
    allowed = []
    blocked = set()
    for source_file in files:
        if not source_file:
            continue
        if _file_is_visible(source_file, viewer_account, catalog):
            allowed.append(source_file)
        else:
            blocked.add(source_file)
    return allowed, blocked


def _visible_file_sets(catalog: dict, viewer_account: dict):
    if not catalog:
        return None, set()
    allowed = []
    blocked = set()
    for source_file, row in catalog.items():
        if store.document_is_visible(row, viewer_account):
            allowed.append(source_file)
        else:
            blocked.add(source_file)
    return allowed, blocked


def _source_filter(source_files):
    if source_files is None:
        return None
    if not source_files:
        return {"source_file": {"$in": []}}
    if len(source_files) == 1:
        return {"source_file": source_files[0]}
    return {"source_file": {"$in": source_files}}


def _similarity_search(chroma_store, question: str, k: int, source_files=None):
    if source_files is not None and not source_files:
        return []
    try:
        filter_arg = _source_filter(source_files)
        if filter_arg is None:
            return chroma_store.similarity_search(question, k=k)
        return chroma_store.similarity_search(question, k=k, filter=filter_arg)
    except Exception:
        return []


def _file_chunk_count(chroma_store, fname: str, catalog: dict) -> int:
    if fname in catalog:
        return int(catalog[fname].get("chunks") or 999)
    try:
        data = chroma_store.get(where={"source_file": fname}, include=[])
        return len(data.get("ids") or [])
    except Exception:
        return 999


def _all_chunks_for_file(chroma_store, fname: str) -> list[Document]:
    out: list[Document] = []
    try:
        data = chroma_store.get(
            where={"source_file": fname},
            include=["documents", "metadatas"],
        )
        for content, meta in zip(
            data.get("documents") or [], data.get("metadatas") or []
        ):
            if content:
                out.append(Document(page_content=content, metadata=meta or {}))
    except Exception:
        pass
    return out


def _expand_matched_files(
    chroma_store, question: str, matched_files: set, catalog: dict
) -> list[Document]:
    """Safely widen context for matched sources without flooding on huge files."""
    out: list[Document] = []
    for fname in matched_files:
        if not fname:
            continue
        info = catalog.get(fname, {})
        modality = info.get("modality") or ""
        n = _file_chunk_count(chroma_store, fname, catalog)
        if modality == "image" or n <= SMALL_FILE_MAX_CHUNKS:
            out.extend(_all_chunks_for_file(chroma_store, fname))
        else:
            try:
                out.extend(
                    chroma_store.similarity_search(
                        question,
                        k=LARGE_FILE_EXTRA_K,
                        filter={"source_file": fname},
                    )
                )
            except Exception:
                pass
    return out


def _keyword_tokens(question: str) -> list[str]:
    """Strong literal lookup terms: tickers/codes that must contain a letter.

    Pure numbers (years, days like 05/2026) are excluded - they would match
    almost any chunk in a literal search.
    """
    tokens = re.findall(r"\b[A-Z]{3,}\b", question)  # ABBN, ABB, SFDR
    tokens += re.findall(r"\b[A-Za-z]*\d[A-Za-z0-9]*\b", question)  # mixed codes
    seen: set[str] = set()
    out: list[str] = []
    for tok in tokens:
        key = tok.upper()
        if not any(c.isalpha() for c in tok):  # skip pure numbers
            continue
        if key not in seen:
            seen.add(key)
            out.append(tok)
    return out[:4]


def _keyword_hits(chroma_store, question: str, source_files=None) -> list[Document]:
    """Literal substring lookup for exact symbols (e.g. ABBN, 83.62 rows).

    Vector similarity averages a long table chunk across all its rows, so a
    single-ticker query ranks it low. An exact-text search on chunk content
    surfaces the right chunk regardless of embedding rank.
    """
    if source_files is not None and not source_files:
        return []
    hits: list[Document] = []
    seen: set[str] = set()
    for tok in _keyword_tokens(question):
        try:
            filter_arg = _source_filter(source_files)
            data = chroma_store.get(
                where=filter_arg,
                where_document={"$contains": tok},
                include=["documents", "metadatas"],
                limit=KEYWORD_SEARCH_K,
            )
        except Exception:
            continue
        for content, meta in zip(
            data.get("documents") or [], data.get("metadatas") or []
        ):
            if not content:
                continue
            key = " ".join(content[:120].split()).lower()
            if key in seen:
                continue
            seen.add(key)
            hits.append(Document(page_content=content, metadata=meta or {}))
    return hits


def _merge_extra(primary: list, extra: list, cap: int) -> list:
    """Append extra chunks not already present; preserve primary order."""
    seen = {" ".join(d.page_content[:120].split()).lower() for d in primary}
    merged = list(primary)
    for d in extra:
        key = " ".join(d.page_content[:120].split()).lower()
        if key not in seen:
            merged.append(d)
            seen.add(key)
        if len(merged) >= cap:
            break
    return merged


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


def route_gap(question: str, docs, graph_debug: dict, focus_topics=None) -> dict:
    """Structured gap router: question + retrieved docs -> owning team.

    ``focus_topics`` lets a partial gap route on the specific unanswered
    sub-topics rather than the whole (partly answered) question.
    """
    routing_question = question
    if focus_topics:
        routing_question = (
            f"{question}\n\nUnanswered parts to route: {', '.join(focus_topics)}"
        )

    signals = _suggest_role_from_signals(routing_question, docs)
    context = _format_context(docs[:5])

    routing: GapRouting = (_gap_prompt | _gap_llm).invoke(
        {
            "question": routing_question,
            "context": context,
            "roles": _roles_for_prompt(),
            "entities_detected": signals["entities_detected"],
            "entity_suggested_role": signals["entity_suggested_role"],
            "chunk_role_counts": signals["chunk_role_counts"],
            "max_chunk_role": signals["max_chunk_role"],
        }
    )

    roles = valid_roles()
    out = routing.model_dump()

    # Keep only catalog roles; fall back to deterministic signals if none valid.
    requested = out.get("routed_to") or []
    if isinstance(requested, str):
        requested = [requested]
    routed_roles = [r for r in requested if r in roles]
    if not routed_roles:
        fallback = (
            signals["entity_suggested_role"]
            if signals["entity_role_counts"]
            else (signals["max_chunk_role"] if signals["chunk_role_counts"] else DEFAULT_ROLE)
        )
        if fallback not in roles:
            fallback = roles[0] if roles else DEFAULT_ROLE
        routed_roles = [fallback]

    out["routed_roles"] = routed_roles
    out["routed_to"] = routed_roles[0]  # primary, for backward compatibility
    out["signals"] = signals
    out["graph_entities"] = graph_debug.get("entities_detected", [])
    return out


def send_gap_ticket(question: str, gap: dict, body: str, missing_topics=None) -> list:
    """Persist a reviewed gap ticket to each routed role (Supabase or local)."""
    gap = gap or {}
    routed_roles = gap.get("routed_roles") or [gap.get("routed_to") or DEFAULT_ROLE]
    tickets = []
    for role in routed_roles:
        tickets.append(
            store.add_gap_ticket(
                question=question,
                routed_to=role,
                body=body,
                missing_topics=missing_topics or [],
            )
        )
    return tickets


def hybrid_retrieve(
    question,
    viewer_account_id: str | None = "standard-employee",
    k_vector=5,
    k_graph=6,
    max_context=10,
):
    chroma = _get_store()
    graph = _get_graph()
    catalog = _source_catalog(graph)
    viewer_account = store.get_demo_account(viewer_account_id)
    allowed_files, blocked_catalog_files = _visible_file_sets(catalog, viewer_account)

    seed = _similarity_search(chroma, question, k_vector, allowed_files)
    seed_files = {d.metadata.get("source_file") for d in seed}
    blocked_seed = _similarity_search(
        chroma, question, k_vector, sorted(blocked_catalog_files)
    )
    blocked_files = {
        d.metadata.get("source_file")
        for d in blocked_seed
        if d.metadata.get("source_file")
    }

    detected = graph_engine.detect_entities(question)
    expanded = graph_engine.expand_entities(detected)
    candidate_files = graph_engine.documents_for_entities(graph, expanded)

    new_files = [f for f in candidate_files if f not in seed_files]
    allowed_new_files, blocked_graph_files = _partition_files_by_access(
        new_files, viewer_account, catalog
    )
    blocked_files |= blocked_graph_files

    graph_hits = []
    if allowed_new_files:
        graph_hits = _similarity_search(chroma, question, k_graph, allowed_new_files)

    keyword_hits = _keyword_hits(chroma, question, allowed_files)
    blocked_keyword_hits = _keyword_hits(chroma, question, sorted(blocked_catalog_files))
    blocked_files |= {
        d.metadata.get("source_file")
        for d in blocked_keyword_hits
        if d.metadata.get("source_file")
    }
    merged = _dedupe(seed + graph_hits + keyword_hits, max_context)

    matched_files = {d.metadata.get("source_file") for d in merged} - {None}
    if matched_files:
        extra = _expand_matched_files(chroma, question, matched_files, catalog)
        merged = _merge_extra(merged, extra, cap=max_context + 6)

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
    access = {
        "viewer_account": viewer_account,
        "restricted_files": sorted(blocked_files),
    }
    return merged, debug, access


def _sanitize_detailed_answer(text: str) -> str:
    text = (text or "").replace("\r\n", "\n")
    if not text.strip():
        return ""

    text = text.replace("\\(", "").replace("\\)", "")
    text = text.replace("\\[", "").replace("\\]", "")
    text = re.sub(r"\$(.+?)\$", r"\1", text, flags=re.DOTALL)

    lines = []
    for raw_line in text.splitlines():
        line = re.sub(r"^\s{0,3}#+\s*", "", raw_line).strip()
        if not line or line == "```":
            lines.append("")
            continue
        if "|" in line and line.count("|") >= 2:
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if not any(cells):
                continue
            if all(set(cell) <= {"-", ":"} for cell in cells if cell):
                continue
            if len(cells) == 2:
                lines.append(f"- {cells[0]}: {cells[1]}")
            else:
                lines.append("- " + " | ".join(cells))
            continue
        lines.append(line)

    cleaned = "\n".join(lines)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _history_text(history) -> str:
    """Render recent conversation turns for the prompt."""
    if not history:
        return "(no prior turns)"
    lines = []
    for m in history[-6:]:
        who = "User" if m.get("role") == "user" else "Assistant"
        lines.append(f"{who}: {m.get('content', '')}")
    return "\n".join(lines)


def _retrieval_query(question: str, history) -> str:
    """Combine recent user turns with the current question for better recall
    on short follow-ups like 'what about X?'."""
    if not history:
        return question
    prior_user = [m["content"] for m in history if m.get("role") == "user"][-2:]
    return " ".join(prior_user + [question]).strip()


def draft_gap_ticket(question: str, missing_topics, gap: dict) -> str:
    """Pre-write a concise, reviewable gap ticket from the query + gaps."""
    routed_roles = (gap or {}).get("routed_roles") or [
        (gap or {}).get("routed_to", DEFAULT_ROLE)
    ]
    routed = ", ".join(routed_roles)
    if missing_topics:
        gaps = "\n".join(f"- {t}" for t in missing_topics)
    else:
        gaps = "- The company knowledge base does not cover this question."
    lines = [
        f"Routed to: {routed}",
        "",
        "Context (what was asked):",
        question.strip(),
        "",
        "Knowledge gaps to fill:",
        gaps,
    ]
    reason = (gap or {}).get("reason")
    if reason:
        label = "Why these teams" if len(routed_roles) > 1 else "Why this team"
        lines += ["", f"{label}: {reason}"]
    return "\n".join(lines)


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


def query_brain(
    question: str,
    history=None,
    viewer_account_id: str | None = "standard-employee",
) -> dict:
    """Answer a question (or follow-up) using company context + LLM knowledge.

    ``history`` is an optional list of {"role", "content"} turns so follow-up
    questions stay in context. Retrieval runs fresh on every turn.
    """
    viewer_account = store.get_demo_account(viewer_account_id)
    docs, graph_debug, access_debug = hybrid_retrieve(
        _retrieval_query(question, history),
        viewer_account_id=viewer_account["id"],
    )
    context = _format_context(docs) if docs else "(no company context retrieved)"

    result: WikiPage = (_prompt | _structured_llm).invoke(
        {
            "question": question,
            "context": context,
            "history": _history_text(history),
        }
    )

    last_updated_dates = sorted(
        {d.metadata.get("last_updated") for d in docs if d.metadata.get("last_updated")}
    )

    out = result.model_dump()
    out["last_updated_dates"] = last_updated_dates
    out["graph"] = graph_debug
    out["viewer_account"] = viewer_account
    out["restricted_source_count"] = len(access_debug.get("restricted_files", []))
    out["access_notice"] = None
    if docs and out["restricted_source_count"]:
        out["access_notice"] = (
            "Some relevant company information was omitted due to this demo account's access level."
        )
    elif not docs and out["restricted_source_count"]:
        out["access_notice"] = (
            "Relevant company information exists but is restricted for this demo account."
        )
    out["detailed_answer"] = _sanitize_detailed_answer(out.get("detailed_answer", ""))
    if not out.get("role_owner") and docs:
        out["role_owner"] = docs[0].metadata.get("role_owner", DEFAULT_ROLE)

    allowed_sources = []
    for source in out.get("sources") or []:
        if source in {d.metadata.get("source_file") for d in docs} and source not in allowed_sources:
            allowed_sources.append(source)
    out["sources"] = allowed_sources

    is_low = out.get("confidence") == "Low"
    # Route + pre-write a gap ticket for full misses (Low) and partial gaps.
    if (is_low or out.get("gap_required")) and not out["restricted_source_count"]:
        gap = route_gap(
            question, docs, graph_debug, focus_topics=out.get("missing_topics")
        )
        out["gap_routing"] = gap
        out["gap_ticket_draft"] = draft_gap_ticket(
            question, out.get("missing_topics"), gap
        )
        if is_low or not out.get("role_owner"):
            out["role_owner"] = gap["routed_to"]
    elif out["restricted_source_count"]:
        out["gap_required"] = False
        out["missing_topics"] = []

    if not out.get("role_owner"):
        out["role_owner"] = DEFAULT_ROLE

    return out
