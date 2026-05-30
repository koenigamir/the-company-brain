"""Persistence layer for roles, gap tickets, and document records.

Local-first: data lives in ./localstore/*.json by default.

Supabase is **opt-in only** — set SUPABASE_ENABLED=true plus SUPABASE_URL and
SUPABASE_KEY if you want remote Postgres. The public API is identical either way.

Supabase tables expected (see supabase_schema.sql):
- roles(id, name unique, description, tags[], status, created_by, created_at)
- gap_tickets(id, question, routed_to, body, missing_topics[], status, created_at)
- documents(source_file unique, role_owner, last_updated, chunks, updated_at)
"""

from __future__ import annotations

import os
import json
import uuid
import datetime
import threading

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:
    load_dotenv = None

if load_dotenv is not None:
    load_dotenv()

LOCAL_DIR = os.getenv("COMPANY_BRAIN_STORE_DIR", "localstore")
_LOCK = threading.Lock()

# Canonical SIX role catalog. Auto-detect is locked to these roles; new roles
# are NOT invented at ingest time. To add a real SIX role, add it here (or via
# add_role) and it becomes available everywhere.
SIX_ROLE_CATALOG = [
    {
        "name": "ESG Compliance",
        "description": "Sustainability and ESG disclosure regulation: SFDR, EU "
        "Taxonomy, EET templates, sustainability data and disclosures.",
        "tags": ["esg", "sfdr", "taxonomy", "eet", "sustainability"],
    },
    {
        "name": "Master Data Ops",
        "description": "Reference and master data: master data opening and "
        "mutations, instrument attributes, instrument classification, EMT "
        "reference data.",
        "tags": ["master data", "reference data", "mutations", "attributes", "classification", "emt"],
    },
    {
        "name": "Tax Team",
        "description": "Tax reporting and withholding: FATCA, qualified "
        "intermediary, withholding tax, Tax Navigator.",
        "tags": ["fatca", "tax", "withholding", "qualified intermediary", "tax navigator"],
    },
    {
        "name": "Regulatory Services",
        "description": "Regulatory interpretation and frameworks: MiFID II, "
        "MiFIR, product governance, suitability and complexity assessment, "
        "Regulatory Navigator.",
        "tags": ["mifid", "mifir", "product governance", "suitability", "complexity", "regulatory navigator"],
    },
    {
        "name": "Product Coverage & Onboarding",
        "description": "Instrument and product coverage, classification "
        "coverage, and onboarding of new products and instruments.",
        "tags": ["product coverage", "coverage", "onboarding", "instruments"],
    },
    {
        "name": "Compliance & Sanctions",
        "description": "Financial crime and market integrity: AML, KYC, "
        "sanctions screening, and trade surveillance.",
        "tags": ["aml", "kyc", "sanctions", "surveillance", "screening"],
    },
]

# Backwards-compatible alias used by older seeding logic.
DEFAULT_ROLES = SIX_ROLE_CATALOG


def catalog_names() -> list[str]:
    return [r["name"] for r in SIX_ROLE_CATALOG]


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# --------------------------------------------------------------------------
# Backend detection
# --------------------------------------------------------------------------
_client = None
_client_tried = False


def _supabase_enabled() -> bool:
    """Supabase is off unless explicitly enabled (local JSON is the default)."""
    return os.getenv("SUPABASE_ENABLED", "").lower() in ("1", "true", "yes")


def _supabase():
    """Return a cached Supabase client, or None if not enabled/configured."""
    global _client, _client_tried
    if _client_tried:
        return _client
    _client_tried = True

    if not _supabase_enabled():
        return None

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        return None
    try:
        from supabase import create_client

        _client = create_client(url, key)
    except Exception:
        _client = None
    return _client


def backend_name() -> str:
    return "supabase" if _supabase() is not None else "local"


# --------------------------------------------------------------------------
# Local JSON helpers
# --------------------------------------------------------------------------
def _local_path(name: str) -> str:
    os.makedirs(LOCAL_DIR, exist_ok=True)
    return os.path.join(LOCAL_DIR, f"{name}.json")


def _local_read(name: str) -> list:
    path = _local_path(name)
    if not os.path.isfile(path):
        return []
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _local_write(name: str, rows: list) -> None:
    with _LOCK:
        with open(_local_path(name), "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2)


# --------------------------------------------------------------------------
# Roles
# --------------------------------------------------------------------------
_catalog_ensured = False


def _ensure_catalog(existing: list[dict]) -> list[dict]:
    """Insert any catalog roles missing from the store (runs once per process)."""
    global _catalog_ensured
    if _catalog_ensured:
        return existing
    have = {r["name"].lower() for r in existing}
    added = False
    for r in SIX_ROLE_CATALOG:
        if r["name"].lower() not in have:
            add_role(r["name"], r["description"], r["tags"], created_by="seed")
            added = True
    _catalog_ensured = True
    return _read_roles_raw() if added else existing


def _read_roles_raw() -> list[dict]:
    client = _supabase()
    if client is not None:
        try:
            return (client.table("roles").select("*").execute()).data or []
        except Exception:
            pass
    return _local_read("roles")


def list_roles() -> list[dict]:
    """Return all roles, ensuring the SIX catalog is present."""
    rows = _read_roles_raw()
    if not rows:
        # Seed the full catalog on first use.
        for r in SIX_ROLE_CATALOG:
            add_role(r["name"], r["description"], r["tags"], created_by="seed")
        rows = _read_roles_raw()
    return _ensure_catalog(rows)


def role_names() -> list[str]:
    return [r["name"] for r in list_roles()]


def get_role(name: str) -> dict | None:
    # Read raw (no seeding) to avoid recursion during catalog seeding.
    for r in _read_roles_raw():
        if r["name"].lower() == name.lower():
            return r
    return None


def add_role(name: str, description: str = "", tags=None, created_by: str = "auto") -> dict:
    """Insert a new role if it does not already exist. Returns the role row."""
    tags = tags or []
    existing = get_role(name)
    if existing:
        return existing

    row = {
        "id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "tags": tags,
        "status": "active",
        "created_by": created_by,
        "created_at": _now_iso(),
    }

    client = _supabase()
    if client is not None:
        try:
            client.table("roles").insert(row).execute()
            return row
        except Exception:
            pass

    rows = _local_read("roles")
    if not any(r["name"].lower() == name.lower() for r in rows):
        rows.append(row)
        _local_write("roles", rows)
    return row


# --------------------------------------------------------------------------
# Gap tickets
# --------------------------------------------------------------------------
def add_gap_ticket(
    question: str,
    routed_to: str,
    body: str,
    missing_topics=None,
    status: str = "open",
) -> dict:
    row = {
        "id": str(uuid.uuid4()),
        "question": question,
        "routed_to": routed_to,
        "body": body,
        "missing_topics": missing_topics or [],
        "status": status,
        "created_at": _now_iso(),
    }

    client = _supabase()
    if client is not None:
        try:
            client.table("gap_tickets").insert(row).execute()
            return row
        except Exception:
            pass

    rows = _local_read("gap_tickets")
    rows.append(row)
    _local_write("gap_tickets", rows)
    return row


def list_gap_tickets() -> list[dict]:
    client = _supabase()
    if client is not None:
        try:
            res = (
                client.table("gap_tickets")
                .select("*")
                .order("created_at", desc=True)
                .execute()
            )
            return res.data or []
        except Exception:
            pass
    return sorted(
        _local_read("gap_tickets"),
        key=lambda r: r.get("created_at", ""),
        reverse=True,
    )


# --------------------------------------------------------------------------
# Documents
# --------------------------------------------------------------------------
def upsert_document(
    source_file: str,
    role_owner: str,
    last_updated: str,
    chunks: int,
    modality: str = "document",
    role_owners=None,
) -> dict:
    row = {
        "source_file": source_file,
        "role_owner": role_owner,
        "role_owners": role_owners or [role_owner],
        "last_updated": last_updated,
        "chunks": chunks,
        "modality": modality,
        "updated_at": _now_iso(),
    }

    client = _supabase()
    if client is not None:
        try:
            client.table("documents").upsert(row, on_conflict="source_file").execute()
            return row
        except Exception:
            pass

    rows = [r for r in _local_read("documents") if r.get("source_file") != source_file]
    rows.append(row)
    _local_write("documents", rows)
    return row


def list_documents() -> list[dict]:
    client = _supabase()
    if client is not None:
        try:
            return (client.table("documents").select("*").execute()).data or []
        except Exception:
            pass
    return _local_read("documents")
