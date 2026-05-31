import os
import shutil

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

import graph_engine
import knowledge_ops
import store

DATA_DIR = knowledge_ops.DATA_DIR
CHROMA_DIR = knowledge_ops.CHROMA_DIR
COLLECTION_NAME = knowledge_ops.COLLECTION_NAME
EMBED_MODEL = knowledge_ops.EMBED_MODEL


def main():
    if os.path.isdir(CHROMA_DIR):
        print(f"Resetting existing vector store at ./{CHROMA_DIR}")
        shutil.rmtree(CHROMA_DIR)

    all_docs = []

    for filename in sorted(os.listdir(DATA_DIR)):
        path = os.path.join(DATA_DIR, filename)
        if not os.path.isfile(path) or filename.startswith("."):
            continue

        docs = knowledge_ops.file_to_documents(path, filename=filename)
        if not docs:
            print(f"SKIP  (unreadable): {filename}")
            continue

        role_owner = docs[0].metadata.get("role_owner", "Unassigned")
        access = store.normalize_document_access(
            source_file=filename,
            role_owner=role_owner,
            role_owners=docs[0].metadata.get("role_owners"),
            visibility_roles=docs[0].metadata.get("visibility_roles"),
            min_clearance=docs[0].metadata.get("min_clearance"),
        )
        knowledge_ops.apply_access_metadata(
            docs,
            access["visibility_roles"],
            access["min_clearance"],
        )
        owners_str = ", ".join(access["role_owners"] or [role_owner])
        for doc in docs:
            doc.metadata["role_owners"] = owners_str

        store.upsert_document(
            filename,
            role_owner,
            docs[0].metadata.get("last_updated"),
            len(docs),
            modality=docs[0].metadata.get("source_modality", "document"),
            role_owners=access["role_owners"],
            visibility_roles=access["visibility_roles"],
            min_clearance=access["min_clearance"],
        )

        all_docs.extend(docs)
        print(
            f"OK    {filename}: {len(docs)} chunks  ->  "
            f"{role_owner}"
        )

    print(f"\nTotal chunks: {len(all_docs)}")
    if not all_docs:
        print("No documents to index. Aborting.")
        return

    embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    Chroma.from_documents(
        documents=all_docs,
        embedding=embeddings,
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_DIR,
    )
    print(f"Saved vector store to ./{CHROMA_DIR}")

    graph = graph_engine.build_graph(all_docs)
    graph_engine.save_graph(graph)
    print(
        f"Saved knowledge graph to ./{graph_engine.GRAPH_PATH}  "
        f"({len(graph['documents'])} docs, {len(graph['entities'])} entities)"
    )


if __name__ == "__main__":
    main()
