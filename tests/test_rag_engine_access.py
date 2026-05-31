from __future__ import annotations

import importlib
import os
import tempfile
import unittest
from unittest.mock import patch

from tests.backend_test_support import FakeDocument, install_backend_stubs


install_backend_stubs()


class _FakeStructuredLLM:
    def __init__(self, wiki_page_cls):
        self.wiki_page_cls = wiki_page_cls
        self.last_payload = None

    def invoke(self, payload):
        self.last_payload = payload
        context = payload["context"]
        if context == "(no company context retrieved)":
            return self.wiki_page_cls(
                title="Restricted",
                short_answer="No accessible company answer was found.",
                detailed_answer="",
                confidence="Low",
                used_llm_knowledge=False,
                sources=[],
                role_owner="",
                gap_required=False,
                missing_topics=[],
            )

        sources = []
        for line in context.splitlines():
            if "source_file=" not in line:
                continue
            start = line.split("source_file=", 1)[1]
            sources.append(start.split(" | ", 1)[0])

        return self.wiki_page_cls(
            title="Answer",
            short_answer="Company context is available.",
            detailed_answer="# Details\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\nUse $x$ now.",
            confidence="High",
            used_llm_knowledge=False,
            sources=sources,
            role_owner="",
            gap_required=False,
            missing_topics=[],
        )


class _FakeGapRouter:
    def __init__(self, default_role):
        self.default_role = default_role

    def __call__(self, *_args, **_kwargs):
        return {
            "routed_to": self.default_role,
            "routed_roles": [self.default_role],
            "reason": "test routing",
        }


class _FakeChroma:
    def __init__(self, docs):
        self.docs = list(docs)

    def _apply_filter(self, docs, filter_spec):
        if not filter_spec:
            return list(docs)
        source_spec = filter_spec.get("source_file")
        if isinstance(source_spec, dict) and "$in" in source_spec:
            allowed = set(source_spec["$in"])
            return [doc for doc in docs if doc.metadata.get("source_file") in allowed]
        if isinstance(source_spec, str):
            return [doc for doc in docs if doc.metadata.get("source_file") == source_spec]
        return list(docs)

    def similarity_search(self, question, k=4, filter=None):
        lowered = question.lower()
        pool = [
            doc
            for doc in self.docs
            if lowered in doc.page_content.lower() or lowered in doc.metadata.get("source_file", "").lower()
        ]
        pool = self._apply_filter(pool, filter)
        return pool[:k]

    def get(self, where=None, include=None, limit=None, where_document=None):
        del include
        pool = list(self.docs)
        if where_document and "$contains" in where_document:
            token = where_document["$contains"].lower()
            pool = [doc for doc in pool if token in doc.page_content.lower()]
        pool = self._apply_filter(pool, where)
        if limit is not None:
            pool = pool[:limit]
        return {
            "ids": [str(idx) for idx, _doc in enumerate(pool)],
            "documents": [doc.page_content for doc in pool],
            "metadatas": [doc.metadata for doc in pool],
        }


class RagEngineAccessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["COMPANY_BRAIN_STORE_DIR"] = self.tmp.name

        import store
        import rag_engine

        self.store = importlib.reload(store)
        self.rag_engine = importlib.reload(rag_engine)
        self.store.upsert_document(
            "General_policy.txt",
            "Master Data Ops",
            "2026-05-31",
            1,
            visibility_roles=["ALL"],
            min_clearance="standard",
        )
        self.store.upsert_document(
            "Confidential_tax_policy.txt",
            "Tax Team",
            "2026-05-31",
            1,
            visibility_roles=["Tax Team"],
            min_clearance="senior",
        )
        self.store.upsert_document(
            "Confidential_esg_policy.txt",
            "ESG Compliance",
            "2026-05-31",
            1,
            visibility_roles=["ESG Compliance"],
            min_clearance="senior",
        )

        self.docs = [
            FakeDocument(
                "general policy standard access",
                {
                    "source_file": "General_policy.txt",
                    "role_owner": "Master Data Ops",
                    "last_updated": "2026-05-31",
                },
            ),
            FakeDocument(
                "tax confidential filing steps",
                {
                    "source_file": "Confidential_tax_policy.txt",
                    "role_owner": "Tax Team",
                    "last_updated": "2026-05-31",
                },
            ),
            FakeDocument(
                "esg confidential sustainability details",
                {
                    "source_file": "Confidential_esg_policy.txt",
                    "role_owner": "ESG Compliance",
                    "last_updated": "2026-05-31",
                },
            ),
        ]
        self.fake_store = _FakeChroma(self.docs)
        self.fake_llm = _FakeStructuredLLM(self.rag_engine.WikiPage)

    def tearDown(self):
        self.tmp.cleanup()

    def _query(self, question, viewer_account_id=None):
        with patch.object(self.rag_engine, "_get_store", return_value=self.fake_store), patch.object(
            self.rag_engine, "_get_graph", return_value={}
        ), patch.object(
            self.rag_engine, "_structured_llm", self.fake_llm
        ), patch.object(
            self.rag_engine, "route_gap", _FakeGapRouter("Tax Team")
        ), patch.object(
            self.rag_engine.graph_engine, "detect_entities", return_value=[]
        ), patch.object(
            self.rag_engine.graph_engine, "expand_entities", side_effect=lambda entities: entities
        ), patch.object(
            self.rag_engine.graph_engine, "documents_for_entities", return_value=[]
        ), patch.object(
            self.rag_engine.graph_engine, "relation_paths", return_value=[]
        ):
            return self.rag_engine.query_brain(
                question,
                viewer_account_id=viewer_account_id,
            )

    def test_standard_employee_retrieves_standard_all_company_document(self):
        result = self._query("general")
        self.assertEqual(result["viewer_account"]["id"], "standard-employee")
        self.assertEqual(result["sources"], ["General_policy.txt"])
        self.assertEqual(result["restricted_source_count"], 0)

    def test_intern_cannot_retrieve_senior_document(self):
        result = self._query("tax", viewer_account_id="intern-general")
        self.assertEqual(result["sources"], [])
        self.assertEqual(result["restricted_source_count"], 1)
        self.assertEqual(
            result["access_notice"],
            "Relevant company information exists but is restricted for this demo account.",
        )

    def test_senior_leader_can_retrieve_cross_department_senior_documents(self):
        result = self._query("confidential", viewer_account_id="senior-leader")
        self.assertCountEqual(
            result["sources"],
            ["Confidential_tax_policy.txt", "Confidential_esg_policy.txt"],
        )
        self.assertEqual(result["restricted_source_count"], 0)

    def test_tax_team_senior_gets_tax_confidential_but_not_esg_confidential(self):
        result = self._query("confidential", viewer_account_id="tax-team-senior")
        self.assertEqual(result["restricted_source_count"], 1)
        self.assertEqual(
            result["access_notice"],
            "Some relevant company information was omitted due to this demo account's access level.",
        )
        self.assertEqual(result["sources"], ["Confidential_tax_policy.txt"])
        payload = self.fake_llm.last_payload or {}
        self.assertNotIn("Confidential_esg_policy.txt", payload.get("context", ""))

    def test_detailed_answer_is_sanitized_to_plain_markdown(self):
        result = self._query("general")
        self.assertEqual(
            result["detailed_answer"],
            "Details\n\n- A: B\n- 1: 2\n\nUse x now.",
        )

    def test_retrieval_prefilters_allowed_files_before_vector_ranking(self):
        docs = [
            FakeDocument(
                "policy overview restricted",
                {
                    "source_file": "Confidential_tax_policy.txt",
                    "role_owner": "Tax Team",
                    "last_updated": "2026-05-31",
                },
            ),
            FakeDocument(
                "policy overview general",
                {
                    "source_file": "General_policy.txt",
                    "role_owner": "Master Data Ops",
                    "last_updated": "2026-05-31",
                },
            ),
        ]
        fake_store = _FakeChroma(docs)
        graph = {"documents": {}}

        with patch.object(self.rag_engine, "_get_store", return_value=fake_store), patch.object(
            self.rag_engine, "_get_graph", return_value=graph
        ), patch.object(
            self.rag_engine.graph_engine, "detect_entities", return_value=[]
        ), patch.object(
            self.rag_engine.graph_engine, "expand_entities", side_effect=lambda entities: entities
        ), patch.object(
            self.rag_engine.graph_engine, "documents_for_entities", return_value=[]
        ), patch.object(
            self.rag_engine.graph_engine, "relation_paths", return_value=[]
        ):
            docs, _graph_debug, access = self.rag_engine.hybrid_retrieve(
                "policy",
                viewer_account_id="standard-employee",
                k_vector=1,
                k_graph=0,
                max_context=2,
            )

        self.assertEqual([doc.metadata["source_file"] for doc in docs], ["General_policy.txt"])
        self.assertEqual(access["restricted_files"], ["Confidential_tax_policy.txt"])

    def test_graph_fallback_preserves_access_control_when_store_is_incomplete(self):
        fake_llm = _FakeStructuredLLM(self.rag_engine.WikiPage)
        graph = {
            "documents": {
                "General_policy.txt": {"role_owner": "Master Data Ops", "entities": []},
                "Confidential_tax_policy.txt": {"role_owner": "Tax Team", "entities": []},
                "Confidential_esg_policy.txt": {"role_owner": "ESG Compliance", "entities": []},
            }
        }

        with patch.object(self.rag_engine.store, "list_documents", return_value=[]), patch.object(
            self.rag_engine, "_get_store", return_value=self.fake_store
        ), patch.object(
            self.rag_engine, "_get_graph", return_value=graph
        ), patch.object(
            self.rag_engine, "_structured_llm", fake_llm
        ), patch.object(
            self.rag_engine, "route_gap", _FakeGapRouter("Tax Team")
        ), patch.object(
            self.rag_engine.graph_engine, "detect_entities", return_value=[]
        ), patch.object(
            self.rag_engine.graph_engine, "expand_entities", side_effect=lambda entities: entities
        ), patch.object(
            self.rag_engine.graph_engine, "documents_for_entities", return_value=[]
        ), patch.object(
            self.rag_engine.graph_engine, "relation_paths", return_value=[]
        ):
            result = self.rag_engine.query_brain(
                "tax",
                viewer_account_id="intern-general",
            )

        self.assertEqual(result["sources"], [])
        self.assertEqual(result["restricted_source_count"], 1)

    def test_add_file_to_brain_forwards_access_fields(self):
        calls = {}

        def add_file_to_brain(
            file_bytes,
            filename,
            role_owner=None,
            visibility_roles=None,
            min_clearance=None,
            save_to_data_dir=True,
        ):
            del save_to_data_dir
            calls["file_bytes"] = file_bytes
            calls["filename"] = filename
            calls["role_owner"] = role_owner
            calls["visibility_roles"] = visibility_roles
            calls["min_clearance"] = min_clearance
            return {"ok": True}

        with patch.object(
            self.rag_engine.knowledge_ops,
            "add_file_to_brain",
            side_effect=add_file_to_brain,
        ):
            result = self.rag_engine.add_file_to_brain(
                b"hello",
                "note.txt",
                role_owner="Tax Team",
                visibility_roles=["Tax Team"],
                min_clearance="senior",
            )

        self.assertTrue(result["ok"])
        self.assertEqual(calls["visibility_roles"], ["Tax Team"])
        self.assertEqual(calls["min_clearance"], "senior")


if __name__ == "__main__":
    unittest.main()
