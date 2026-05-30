import streamlit as st
from rag_engine import query_brain

st.set_page_config(page_title="Company Brain", page_icon="brain", layout="wide")


def render_graph_panel(graph: dict):
    """Show the GraphRAG reasoning path: entities, relationships, linked docs."""
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

# ---------- Sidebar: fake RBAC ----------
st.sidebar.title("Company Brain")
role = st.sidebar.selectbox(
    "Simulate Role:",
    ["Standard Employee", "ESG Compliance Officer"],
)
st.sidebar.caption(f"Signed in as: **{role}**")
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
        result = query_brain(query)

    confidence = result.get("confidence", "Low")

    # ---------- Path A: trusted answer ----------
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

    # ---------- Path B: knowledge gap ----------
    else:
        st.error("Insufficient verified knowledge to generate a canonical answer.")
        gap_owner = result.get("role_owner", "Master Data Ops")

        if st.button("Route Knowledge Gap to Subject Matter Expert"):
            st.success(
                f"Knowledge Gap Ticket created and routed to the **{gap_owner}** "
                "team. They will fill in this information."
            )

        with st.expander("Why this was flagged as a gap"):
            render_graph_panel(result.get("graph"))

        # ---------- Bonus: SME view for ESG officer ----------
        if role == "ESG Compliance Officer":
            st.divider()
            st.subheader("SME View: Draft a response to fill this knowledge gap")
            st.text_area(
                "Expert response",
                placeholder="As the subject-matter expert, draft the canonical "
                "answer that should be added to the company brain...",
                height=180,
            )
            st.button("Submit Expert Answer")
