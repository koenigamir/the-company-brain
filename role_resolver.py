"""Dynamic role assignment, constrained to the canonical SIX role catalog.

For each new document we look at the real SIX roles that exist and pick the
best fit. A document may be assigned to MORE THAN ONE role, but only when it
genuinely spans multiple domains (so the knowledge base gets multiple owning
views). We never invent a role that is not in the catalog.
"""

from __future__ import annotations

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate

import store

load_dotenv()

LLM_MODEL = "claude-sonnet-4-6"


class RoleAssignment(BaseModel):
    roles: list[str] = Field(
        description="One or more owning roles, chosen ONLY from the provided "
        "role list. Use a SINGLE role unless the document genuinely spans "
        "multiple domains, in which case list each relevant role."
    )
    reason: str = Field(description="One sentence justifying the assignment.")


_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You assign owning team(s)/role(s) to a document for SIX, a "
            "financial regulatory-data company.\n\n"
            "You are given the CURRENT SIX roles (name + domain). You MUST pick "
            "roles ONLY from that list. NEVER invent a new role or rename one.\n"
            "Default to exactly ONE role - the single best owner. Only return "
            "multiple roles when the document clearly and substantially covers "
            "more than one role's domain (e.g. an ESG topic that also drives "
            "MiFID product governance). Do not add weakly-related roles.",
        ),
        (
            "human",
            "Available SIX roles:\n{roles}\n\n"
            "Document file name: {filename}\n\n"
            "Document excerpt:\n{excerpt}",
        ),
    ]
)

_llm = ChatAnthropic(model=LLM_MODEL, temperature=0, max_tokens=600)
_resolver = _llm.with_structured_output(RoleAssignment)


def _format_roles(roles: list[dict]) -> str:
    return "\n".join(f"- {r['name']}: {r.get('description', '')}" for r in roles)


def _snap_to_catalog(names: list[str], roles: list[dict]) -> list[str]:
    """Keep only names that exist in the catalog (case-insensitive), de-duped."""
    by_lower = {r["name"].lower(): r["name"] for r in roles}
    out = []
    for n in names:
        canon = by_lower.get((n or "").strip().lower())
        if canon and canon not in out:
            out.append(canon)
    return out


def resolve_role(text: str, filename: str) -> dict:
    """Return {role, roles, reason}. ``role`` is the primary owner; ``roles``
    is the full list (1+), all from the SIX catalog."""
    roles = store.list_roles()
    default = roles[0]["name"] if roles else "Master Data Ops"
    excerpt = (text or "").strip()[:2500] or "(no extractable text)"

    try:
        result: RoleAssignment = (_PROMPT | _resolver).invoke(
            {
                "roles": _format_roles(roles),
                "filename": filename,
                "excerpt": excerpt,
            }
        )
        chosen = _snap_to_catalog(result.roles, roles)
        reason = result.reason
    except Exception:
        chosen, reason = [], "Fallback (resolver unavailable)."

    if not chosen:
        chosen = [default]
        reason = reason or "Fallback to default intake role."

    return {"role": chosen[0], "roles": chosen, "reason": reason}
