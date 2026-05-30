import os
import shutil

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

import graph_engine
import knowledge_ops

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

        all_docs.extend(docs)
        print(
            f"OK    {filename}: {len(docs)} chunks  ->  "
            f"{docs[0].metadata['role_owner']}"
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
