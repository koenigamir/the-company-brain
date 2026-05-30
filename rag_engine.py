from typing import List
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from langchain_anthropic import ChatAnthropic
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

CHROMA_DIR = "chroma_db"
COLLECTION_NAME = "company_brain"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL = "claude-sonnet-4-6"


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
"""

_llm = ChatAnthropic(model=LLM_MODEL, temperature=0)
_structured_llm = _llm.with_structured_output(WikiPage)

_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        ("human", "Question:\n{question}\n\nContext chunks:\n{context}"),
    ]
)


def _get_retriever(k: int = 5):
    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    store = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )
    return store.as_retriever(search_kwargs={"k": k})


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
    retriever = _get_retriever()
    docs = retriever.invoke(question)

    if not docs:
        return {
            "title": "No Results",
            "summary": "No indexed knowledge was found for this query.",
            "confidence": "Low",
            "sources": [],
            "role_owner": "Master Data Ops",
            "last_updated_dates": [],
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
        out["role_owner"] = docs[0].metadata.get("role_owner", "Master Data Ops")
    return out
