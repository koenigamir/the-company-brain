from __future__ import annotations

import os

import streamlit as st

import api_client

st.set_page_config(page_title="Company Brain", page_icon="brain", layout="wide")

API_URL = os.getenv("COMPANY_BRAIN_API_URL")
ROLE_OWNERS = ["ESG Compliance", "Master Data Ops", "Tax Team"]


def query_company_brain(question: str) -> dict:
    if API_URL:
        return api_client.query_brain_remote(API_URL, question)

    from rag_engine import query_brain

    return query_brain(question)


def add_uploaded_file_to_brain(
    file_bytes: bytes,
    filename: str,
    role_owner: str | None = None,
) -> dict:
    if API_URL:
        return api_client.add_file_to_brain_remote(
            API_URL,
            file_bytes,
            filename,
            role_owner=role_owner,
        )

    from rag_engine import add_file_to_brain

    return add_file_to_brain(file_bytes, filename, role_owner=role_owner)


def render_graph_panel(graph: dict):
    if not graph:
        return
    detected = graph.get("entities_detected", [])
    if not detected:
        st.caption("Graph: no known entities detected in this query (vector-only answer).")
        return

    st.markdown("**Knowledge Graph path**")
    st.markdown(f"- **Entities detected:** {', '.join(detected)}")

    expanded = graph.get("entities_expanded", [])
    if expanded:
        st.markdown(f"- **Expanded (1 hop):** {', '.join(expanded)}")

    for path in graph.get("relation_paths", []):
        st.markdown(f"- {path}")

    added = graph.get("graph_added_files", [])
    if added:
        st.markdown("- **Cross-document context pulled in via graph:**")
        for f in added:
            st.markdown(f"    - {f}")


def render_gap_routing(gap: dict):
    if not gap:
        return
    st.markdown(f"**Routed to:** `{gap.get('routed_to', 'Master Data Ops')}`")
    st.markdown(f"**Reason:** {gap.get('reason', '')}")
    st.caption(f"Routing confidence: {gap.get('routing_confidence', 'Low')}")
    signals = gap.get("signals") or {}
    if signals.get("entity_role_counts"):
        st.caption(f"Question entity signals: {signals['entity_role_counts']}")
    if signals.get("chunk_role_counts"):
        st.caption(f"Retrieved chunk owners: {signals['chunk_role_counts']}")


# ---------- Sidebar ----------
st.sidebar.title("Company Brain")
if API_URL:
    st.sidebar.caption(f"Backend API: `{API_URL}`")
else:
    st.sidebar.caption("Backend API: local in-process mode")

role = st.sidebar.selectbox(
    "Simulate Role:",
    ["Standard Employee", "ESG Compliance Officer"],
)
st.sidebar.caption(f"Signed in as: **{role}**")
st.sidebar.divider()

# ---------- Add knowledge (incremental ingest) ----------
st.sidebar.subheader("Add Knowledge")
uploaded = st.sidebar.file_uploader(
    "Upload a document",
    type=["pdf", "docx", "xlsx", "xlsm", "txt"],
    help="File is saved to data/, chunked, embedded into Chroma, and linked in the graph.",
)
upload_role = st.sidebar.selectbox(
    "Assign owner (optional)",
    ["Auto-detect from filename"] + ROLE_OWNERS,
)

if uploaded is not None:
    if st.sidebar.button("Ingest into Company Brain", type="primary"):
        with st.spinner(f"Ingesting {uploaded.name}..."):
            owner = None if upload_role == "Auto-detect from filename" else upload_role
            result = add_uploaded_file_to_brain(
                uploaded.getvalue(),
                uploaded.name,
                role_owner=owner,
            )
        if result.get("ok"):
            st.sidebar.success(
                f"Added **{result['chunks']}** chunks from `{result['filename']}` "
                f"(owner: {result['role_owner']})"
            )
            if result.get("entities"):
                st.sidebar.caption(f"Graph entities: {', '.join(result['entities'])}")
        else:
            st.sidebar.error(result.get("error", "Ingest failed."))

st.sidebar.divider()

# ---------- Main search ----------
st.title("Company Brain - LLM Wiki")
st.caption("Ask anything about SIX regulatory & reference-data knowledge.")

query = st.text_input(
    "Search the company brain:",
    placeholder="e.g. What are the MiFID II product governance requirements?",
)

if query:
    with st.spinner("Synthesizing canonical answer..."):
        result = query_company_brain(query)

    confidence = result.get("confidence", "Low")

    if confidence in ("High", "Medium"):
        st.header(result["title"])

        badge = "High" if confidence == "High" else "Medium"
        st.markdown(f"**Confidence:** {badge}")

        st.markdown(result["summary"])

        with st.expander("Wiki Metadata", expanded=True):
            st.markdown(f"**Owned by:** `{result['role_owner']}`")
            st.markdown("**Sources:**")
            for s in result.get("sources", []):
                st.markdown(f"- {s}")
            dates = result.get("last_updated_dates", [])
            if dates:
                st.markdown(f"**Last updated:** {', '.join(dates)}")
            st.divider()
            render_graph_panel(result.get("graph"))

        st.sidebar.subheader("Wiki Metadata")
        st.sidebar.write(f"**Owner:** {result['role_owner']}")
        st.sidebar.write(f"**Sources:** {len(result.get('sources', []))}")
        graph = result.get("graph") or {}
        if graph.get("used_graph"):
            st.sidebar.success("GraphRAG: cross-document context used")

    else:
        st.error("Insufficient verified knowledge to generate a canonical answer.")
        gap = result.get("gap_routing") or {}
        gap_owner = gap.get("routed_to") or result.get("role_owner", "Master Data Ops")

        with st.expander("Gap routing decision", expanded=True):
            render_gap_routing(gap)

        if st.button("Route Knowledge Gap to Subject Matter Expert"):
            st.success(
                f"Knowledge Gap Ticket created and routed to the **{gap_owner}** "
                "team. They will fill in this information."
            )

        with st.expander("Why this was flagged as a gap"):
            render_graph_panel(result.get("graph"))

        if role == "ESG Compliance Officer":
            st.divider()
            st.subheader("SME View: Draft a response to fill this knowledge gap")
            sme_draft = st.text_area(
                "Expert response",
                placeholder="Draft the canonical answer. You can also upload a document "
                "via the sidebar to add it to the knowledge base.",
                height=180,
                key="sme_draft",
            )
            if st.button("Submit Expert Answer"):
                if sme_draft.strip():
                    st.info(
                        "Draft saved for demo. To persist, upload a document via "
                        "**Add Knowledge** in the sidebar, or paste content into a .txt/.docx file."
                    )
                else:
                    st.warning("Please enter a draft response first.")
