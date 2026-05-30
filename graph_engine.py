"""
Tier 1 GraphRAG knowledge graph.

This is a lightweight, dependency-free knowledge graph built from filenames and
chunk keywords. It is NOT a full graph database; it exists so retrieval can
follow entity relationships (regulation -> template -> owning role) across
documents instead of relying on vector similarity alone.

Graph shape (saved to graph.json):
{
  "documents": {source_file: {"role_owner": str, "entities": [str, ...]}},
  "entities":  {name: {"type": str, "documents": [source_file, ...]}},
  "roles":     {role: {"documents": [source_file, ...]}}
}

Entity relationships (IMPLEMENTS / RELATED_TO) are static domain knowledge and
live in RELATIONS below, so they do not need to be stored per build.
"""

import os
import re
import json
from collections import defaultdict

GRAPH_PATH = "graph.json"

# ---------------------------------------------------------------------------
# Domain ontology: canonical entity -> keywords that imply it.
# Keywords are matched (case-insensitive substring) against filename + content.
# ---------------------------------------------------------------------------
ENTITIES = {
    "MiFID II": {
        "type": "Regulation",
        "keywords": [
            "mifid",
            "2014l0065",
            "esma35",
            "product governance",
            "complex debt",
            "structured deposit",
            "investor protection",
        ],
    },
    "MiFIR": {
        "type": "Regulation",
        "keywords": ["mifir", "2014r0600", "transparency"],
    },
    "SFDR": {
        "type": "Regulation",
        "keywords": ["sfdr", "2019r2088", "sustainable finance disclosure"],
    },
    "EU Taxonomy / ESG": {
        "type": "Regulation",
        "keywords": ["esg", "taxonomy", "jc_2021_50", "sustainab"],
    },
    "FATCA": {
        "type": "Regulation",
        "keywords": ["fatca", "foreign account"],
    },
    "EET Template": {
        "type": "Template",
        "keywords": ["eet", "european esg template"],
    },
    "EMT Template": {
        "type": "Template",
        "keywords": ["emt", "findatex", "european mifid template"],
    },
    "Reference Data": {
        "type": "Topic",
        "keywords": [
            "reference data",
            "master data",
            "data attribute",
            "mutation",
            "instrument classification",
        ],
    },
    "Tax Reporting": {
        "type": "Topic",
        "keywords": ["withholding", "tax navigator", "qualified intermediary"],
    },
    "Product Coverage": {
        "type": "Topic",
        "keywords": ["product coverage", "coverage", "onboarding"],
    },
}

# Static cross-entity relationships (the "graph edges" that enable cross-context).
# (subject, relation, object)
RELATIONS = [
    ("EET Template", "IMPLEMENTS", "EU Taxonomy / ESG"),
    ("EET Template", "IMPLEMENTS", "SFDR"),
    ("EMT Template", "IMPLEMENTS", "MiFID II"),
    ("MiFID II", "RELATED_TO", "MiFIR"),
    ("SFDR", "RELATED_TO", "EU Taxonomy / ESG"),
    ("FATCA", "RELATED_TO", "Tax Reporting"),
]


# Pre-compile a word-boundary regex per entity. Word boundaries stop short
# acronyms (eet, emt, esg) from matching inside unrelated words such as
# "facsheet", "system", or "spreadsheet".
_ENTITY_PATTERNS = {
    name: re.compile(
        "|".join(r"\b" + re.escape(kw) + r"\b" for kw in spec["keywords"]),
        re.IGNORECASE,
    )
    for name, spec in ENTITIES.items()
}


def detect_entities(text: str) -> list:
    """Return canonical entity names whose keywords appear in the text."""
    found = []
    for name, pattern in _ENTITY_PATTERNS.items():
        if pattern.search(text):
            found.append(name)
    return found


def expand_entities(entities) -> list:
    """Add entities one hop away via IMPLEMENTS / RELATED_TO (both directions)."""
    result = set(entities)
    for subj, _rel, obj in RELATIONS:
        if subj in result:
            result.add(obj)
        if obj in result:
            result.add(subj)
    return sorted(result)


def relation_paths(entities) -> list:
    """Human-readable edges among the given entities, for UI display."""
    eset = set(entities)
    paths = []
    for subj, rel, obj in RELATIONS:
        if subj in eset or obj in eset:
            arrow = "implements" if rel == "IMPLEMENTS" else "related to"
            paths.append(f"{subj} \u2192 {arrow} \u2192 {obj}")
    return paths


# ---------------------------------------------------------------------------
# Build / persist
# ---------------------------------------------------------------------------
def build_graph(documents) -> dict:
    """
    Build the graph from a list of LangChain Documents (chunks).
    Each chunk carries metadata: source_file, role_owner.
    """
    text_by_file = defaultdict(list)
    role_by_file = {}
    for d in documents:
        sf = d.metadata.get("source_file", "unknown")
        text_by_file[sf].append(d.page_content)
        role_by_file[sf] = d.metadata.get("role_owner", "Unassigned")

    documents_node = {}
    entities_node = {name: {"type": spec["type"], "documents": []}
                     for name, spec in ENTITIES.items()}
    roles_node = defaultdict(lambda: {"documents": []})

    for sf, chunks in text_by_file.items():
        scan_text = sf + " " + " ".join(chunks)
        ents = detect_entities(scan_text)
        role = role_by_file.get(sf, "Unassigned")

        documents_node[sf] = {"role_owner": role, "entities": ents}
        roles_node[role]["documents"].append(sf)
        for e in ents:
            entities_node[e]["documents"].append(sf)

    # Drop entities that never appeared in any document.
    entities_node = {k: v for k, v in entities_node.items() if v["documents"]}

    return {
        "documents": documents_node,
        "entities": entities_node,
        "roles": dict(roles_node),
    }


def save_graph(graph: dict, path: str = GRAPH_PATH) -> None:
    with open(path, "w") as f:
        json.dump(graph, f, indent=2)


def load_graph(path: str = GRAPH_PATH):
    if not os.path.isfile(path):
        return None
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Query-time traversal
# ---------------------------------------------------------------------------
def documents_for_entities(graph: dict, entities) -> list:
    """Union of source files linked to any of the given entities."""
    if not graph:
        return []
    files = []
    ent_node = graph.get("entities", {})
    for e in entities:
        for sf in ent_node.get(e, {}).get("documents", []):
            if sf not in files:
                files.append(sf)
    return files
