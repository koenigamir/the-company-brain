from rag_engine import query_brain
import json

queries = [
    "What is the EMT template?",
    "Regulatory Navigator",
    "What is MiFID II?"
]

for q in queries:
    print(f"\n--- Testing: {q} ---")
    res = query_brain(q)
    print(f"Confidence: {res.get('confidence')}")
    print(f"Summary Length: {len(res.get('summary', ''))}")
    print(f"Sources: {res.get('sources')}")
