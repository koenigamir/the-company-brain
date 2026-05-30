import os
import uuid

import streamlit as st

import api_client

st.set_page_config(page_title="Company Brain", page_icon="brain", layout="wide")

API_URL = os.getenv("COMPANY_BRAIN_API_URL")
DEFAULT_ROLES = [
    "ESG Compliance",
    "Master Data Ops",
    "Tax Team",
    "Regulatory Services",
    "Product Coverage & Onboarding",
    "Compliance & Sanctions",
]
MEDIA_EXTS = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".mp4", ".mov", ".mkv", ".webm"}

CONFIDENCE_BADGE = {
    "High": ":green[High]",
    "Medium": ":orange[Medium]",
    "Low": ":red[Low]",
}


def _top_action(label: str):
    """Use a popover when available (Streamlit >= 1.32), else an expander."""
    if hasattr(st, "popover"):
        return st.popover(label, use_container_width=True)
    return st.expander(label)


def _role_options() -> list:
    if API_URL:
        try:
            return api_client.list_roles_remote(API_URL)
        except Exception:
            return DEFAULT_ROLES
    try:
        import knowledge_ops
        import store

        return store.role_names()
    except Exception:
        return DEFAULT_ROLES


def _storage_backend() -> str:
    if API_URL:
        return f"api: {API_URL}"
    try:
        import store

        return store.backend_name()
    except Exception:
        return "local"


def _is_media(filename: str) -> bool:
    return os.path.splitext(filename)[1].lower() in MEDIA_EXTS


def query_company_brain(question: str, history=None) -> dict:
    if API_URL:
        return api_client.query_brain_remote(API_URL, question, history=history)

    from rag_engine import query_brain

    return query_brain(question, history=history)


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


def send_gap_ticket(question: str, gap: dict, body: str, missing_topics=None) -> None:
    if API_URL:
        api_client.send_gap_ticket_remote(
            API_URL,
            question=question,
            gap=gap,
            body=body,
            missing_topics=missing_topics or [],
        )
        return

    import rag_engine

    rag_engine.send_gap_ticket(question, gap, body, missing_topics)


# ---------- Conversation state ----------
def _new_conversation() -> dict:
    return {"id": str(uuid.uuid4()), "title": "New chat", "messages": [], "sent": set()}


if "conversations" not in st.session_state:
    conv = _new_conversation()
    st.session_state.conversations = [conv]
    st.session_state.active_id = conv["id"]


def _active() -> dict:
    for c in st.session_state.conversations:
        if c["id"] == st.session_state.active_id:
            return c
    st.session_state.active_id = st.session_state.conversations[0]["id"]
    return st.session_state.conversations[0]


# ---------- Rendering helpers ----------
def render_wiki_metadata(result: dict):
    with st.expander("Wiki metadata", expanded=False):
        st.markdown(f"**Owned by:** `{result.get('role_owner', 'Master Data Ops')}`")
        st.markdown(f"**Confidence:** {result.get('confidence', 'Low')}")
        used_llm = "Yes" if result.get("used_llm_knowledge") else "No"
        st.markdown(f"**Used general (non-company) knowledge:** {used_llm}")

        sources = result.get("sources", [])
        if sources:
            st.markdown("**Company sources:**")
            for s in sources:
                st.markdown(f"- {s}")
        else:
            st.markdown("**Company sources:** none (general-knowledge answer)")

        dates = result.get("last_updated_dates", [])
        if dates:
            st.markdown(f"**Latest data point:** {max(dates)}")
            if len(dates) > 1:
                st.caption(f"All source dates: {', '.join(dates)}")


def render_gap_ticket(result, idx, prewritten, question, conv):
    gap = result.get("gap_routing") or {}
    routed_roles = gap.get("routed_roles") or [
        gap.get("routed_to") or result.get("role_owner", "Master Data Ops")
    ]
    routed_label = ", ".join(routed_roles)
    missing = result.get("missing_topics", [])

    if idx in conv["sent"]:
        st.success(f"Gap ticket sent to **{routed_label}** for review.")
        return

    label = "Knowledge gap ticket (review & send)" if prewritten else "Report a gap / request SME"
    note_key = f"gapnote_{conv['id']}_{idx}"
    with st.expander(label, expanded=prewritten):
        if missing:
            st.warning("Not covered by company data:\n" + "\n".join(f"- {t}" for t in missing))
        reason = gap.get("reason")
        if len(routed_roles) > 1:
            st.caption(f"Routed to **{len(routed_roles)} roles** (spans domains): {routed_label}")
        else:
            st.caption(f"Routed to: **{routed_label}**")
        if reason:
            st.caption(reason)

        default_text = result.get("gap_ticket_draft", "") if prewritten else ""
        st.text_area(
            "Review / edit the ticket before sending:",
            value=default_text,
            height=180,
            key=note_key,
            placeholder="Describe the missing data or ask the responsible person "
            "whether it makes sense to add it.",
        )
        if st.button("Send gap ticket", key=f"gapsend_{conv['id']}_{idx}", type="primary"):
            body = st.session_state.get(note_key, default_text)
            try:
                send_gap_ticket(question, gap, body, missing)
            except Exception:
                pass
            conv["sent"].add(idx)
            st.rerun()


def render_answer(result, idx, question, conv):
    confidence = result.get("confidence", "Low")
    title = result.get("title")
    short = result.get("short_answer", "")
    detailed = result.get("detailed_answer", "")
    used_llm = result.get("used_llm_knowledge", False)

    if title:
        st.markdown(f"#### {title}")
    st.markdown(f"**Confidence:** {CONFIDENCE_BADGE.get(confidence, confidence)}")

    if confidence == "Low":
        st.error("Insufficient verified company knowledge for this question.")
        st.markdown(short)
        if used_llm:
            st.caption(
                "This answer is generated from the assistant's general knowledge and "
                "is NOT based on company data."
            )
        else:
            st.caption(
                "The retrieved company context did not fully answer this question. "
                "Try a new chat after uploading data, or ask more specifically."
            )
    else:
        st.markdown(short)
        if used_llm:
            st.caption(
                "Note: this answer combines company data with the assistant's "
                "general knowledge."
            )

    if detailed and detailed.strip():
        with st.expander("Show more (detailed answer)"):
            st.markdown(detailed)

    render_wiki_metadata(result)
    render_gap_ticket(
        result, idx, prewritten=confidence in ("Medium", "Low"), question=question, conv=conv
    )


# ---------- Sidebar: chat history + new chat ----------
with st.sidebar:
    st.title("Company Brain")
    if st.button("➕  New chat", use_container_width=True, type="primary"):
        conv = _new_conversation()
        st.session_state.conversations.insert(0, conv)
        st.session_state.active_id = conv["id"]
        st.rerun()

    st.divider()
    st.caption("Chat history")
    for c in st.session_state.conversations:
        label = (c["title"] or "New chat")[:38]
        marker = "🟢 " if c["id"] == st.session_state.active_id else ""
        if st.button(marker + label, key=f"conv_{c['id']}", use_container_width=True):
            st.session_state.active_id = c["id"]
            st.rerun()

    st.divider()
    st.caption(f"Storage backend: **{_storage_backend()}**")

# ---------- Header + top-right actions ----------
active = _active()

col_title, col_actions = st.columns([0.62, 0.38])
with col_title:
    st.title("Company Brain")
    st.caption("Ask anything about SIX regulatory & reference-data knowledge.")

with col_actions:
    a1, a2 = st.columns(2)

    with a1:
        with _top_action("Settings"):
            role = st.selectbox("Simulate role", ["Standard Employee"] + _role_options(), key="role")
            st.caption(f"Signed in as: **{role}**")
            st.caption(f"Storage: {_storage_backend()}")

    with a2:
        with _top_action("Add Knowledge"):
            uploaded = st.file_uploader(
                "Upload a document, media, or image file",
                type=[
                    "pdf", "docx", "xlsx", "xlsm", "txt",
                    "mp3", "wav", "m4a", "aac", "flac", "ogg",
                    "mp4", "mov", "mkv", "webm",
                    "jpg", "jpeg", "png", "heic", "heif", "webp", "gif", "bmp", "tiff",
                ],
                help="Documents are parsed; audio/video are transcribed; images "
                "are read with vision OCR. Then chunked, embedded, and assigned "
                "an owning role.",
            )
            upload_role = st.selectbox(
                "Assign owner",
                ["Auto (match or create a role)"] + _role_options(),
            )
            if uploaded is not None and st.button(
                "Ingest into Company Brain", type="primary", use_container_width=True
            ):
                verb = "Transcribing" if _is_media(uploaded.name) else "Ingesting"
                with st.spinner(f"{verb} {uploaded.name}... (media can take a few minutes)"):
                    owner = None if upload_role.startswith("Auto") else upload_role
                    res = add_uploaded_file_to_brain(
                        uploaded.getvalue(), uploaded.name, role_owner=owner
                    )
                if res.get("ok"):
                    owners = res.get("role_owners") or [res.get("role_owner")]
                    owner_label = ", ".join(owners)
                    st.success(
                        f"Added {res['chunks']} chunks from {res['filename']}"
                    )
                    if len(owners) > 1:
                        st.info(
                            f"Assigned to **{len(owners)} roles** (spans domains): "
                            f"{owner_label}. {res.get('role_reason', '')}"
                        )
                    else:
                        st.caption(f"Owner: **{owner_label}**. {res.get('role_reason', '')}")
                    if res.get("modality") in ("audio", "video"):
                        conf = res.get("extraction_confidence")
                        conf_txt = f", confidence {conf}" if conf is not None else ""
                        st.caption(
                            f"Transcribed {res['modality']} via "
                            f"`{res.get('extractor', 'unknown')}`{conf_txt}."
                        )
                    elif res.get("modality") == "image":
                        conf = res.get("extraction_confidence")
                        conf_txt = f", confidence {conf}" if conf is not None else ""
                        st.caption(
                            f"Read image via `{res.get('extractor', 'unknown')}`"
                            f"{conf_txt}."
                        )
                    st.info(
                        "Ask a **new question** below to query this upload. "
                        "Earlier answers in this chat are not refreshed automatically."
                    )
                else:
                    st.error(res.get("error", "Ingest failed."))

st.divider()

# ---------- Chat thread ----------
for i, msg in enumerate(active["messages"]):
    with st.chat_message(msg["role"]):
        if msg["role"] == "user":
            st.markdown(msg["content"])
        else:
            question = active["messages"][i - 1]["content"] if i > 0 else ""
            render_answer(msg["result"], i, question, active)

if not active["messages"]:
    st.info(
        "Ask a question to begin. High and Medium answers support follow-up "
        "questions that keep the conversation context."
    )

prompt = st.chat_input("Ask the company brain...")
if prompt:
    if not active["messages"]:
        active["title"] = prompt[:38]
    active["messages"].append({"role": "user", "content": prompt})
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in active["messages"][:-1]
    ]
    with st.spinner("Synthesizing answer..."):
        result = query_company_brain(prompt, history=history)
    active["messages"].append(
        {"role": "assistant", "content": result.get("short_answer", ""), "result": result}
    )
    st.rerun()
