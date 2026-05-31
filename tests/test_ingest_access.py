from __future__ import annotations

import importlib
import os
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

from tests.backend_test_support import FakeDocument, install_backend_stubs


install_backend_stubs()


class _DummyChromaStore:
    def __init__(self):
        self.docs = []

    def add_documents(self, docs):
        self.docs.extend(docs)


class IngestAccessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["COMPANY_BRAIN_STORE_DIR"] = os.path.join(self.tmp.name, "store")
        os.environ["COMPANY_BRAIN_DATA_DIR"] = os.path.join(self.tmp.name, "data")
        os.environ["COMPANY_BRAIN_CHROMA_DIR"] = os.path.join(self.tmp.name, "chroma")
        os.makedirs(os.environ["COMPANY_BRAIN_DATA_DIR"], exist_ok=True)

        import store
        import knowledge_ops
        import ingest

        self.store = importlib.reload(store)
        self.knowledge_ops = importlib.reload(knowledge_ops)
        self.ingest = importlib.reload(ingest)

    def tearDown(self):
        self.tmp.cleanup()

    def test_incremental_ingest_persists_visibility_roles_and_min_clearance(self):
        chroma = _DummyChromaStore()
        media_ingest = types.SimpleNamespace(
            modality_of=lambda filename: "document",
            is_media=lambda filename: False,
        )
        image_ingest = types.SimpleNamespace(is_image=lambda filename: False)
        fake_store = types.SimpleNamespace(
            upsert_document=self.store.upsert_document,
            normalize_document_access=self.store.normalize_document_access,
        )

        with patch.dict(
            sys.modules,
            {
                "media_ingest": media_ingest,
                "image_ingest": image_ingest,
                "store": fake_store,
            },
        ):
            with patch.object(
                self.knowledge_ops, "extract_text", return_value="confidential tax steps"
            ), patch.object(
                self.knowledge_ops, "get_splitter"
            ) as get_splitter, patch.object(
                self.knowledge_ops, "get_chroma_store", return_value=chroma
            ), patch.object(
                self.knowledge_ops.graph_engine, "load_graph", return_value=None
            ), patch.object(
                self.knowledge_ops.graph_engine,
                "merge_document",
                side_effect=lambda graph, *_args: graph,
            ), patch.object(
                self.knowledge_ops.graph_engine, "save_graph", return_value=None
            ):
                get_splitter.return_value.split_text.return_value = [
                    "confidential tax steps"
                ]
                result = self.knowledge_ops.add_file_to_brain(
                    b"secret",
                    "Confidential_tax_policy.txt",
                    role_owner="Tax Team",
                    visibility_roles=["Tax Team"],
                    min_clearance="senior",
                    save_to_data_dir=False,
                )

        self.assertTrue(result["ok"])
        self.assertEqual(chroma.docs[0].metadata["visibility_roles"], "Tax Team")
        docs = self.store.list_documents()
        self.assertEqual(docs[0]["visibility_roles"], ["Tax Team"])
        self.assertEqual(docs[0]["min_clearance"], "senior")

    def test_full_rebuild_writes_document_rows_with_access_backfill(self):
        confidential_name = "Confidential_tax_policy.txt"
        public_name = "General_policy.txt"
        for filename in (confidential_name, public_name):
            with open(
                os.path.join(os.environ["COMPANY_BRAIN_DATA_DIR"], filename),
                "w",
                encoding="utf-8",
            ) as f:
                f.write("placeholder")

        def fake_file_to_documents(path, filename=None, role_owner=None, last_updated=None):
            del path, last_updated
            if filename == confidential_name:
                return [
                    FakeDocument(
                        "tax policy",
                        {
                            "source_file": filename,
                            "role_owner": "Tax Team",
                            "last_updated": "2026-05-31",
                        },
                    )
                ]
            return [
                FakeDocument(
                    "general policy",
                    {
                        "source_file": filename,
                        "role_owner": role_owner or "Master Data Ops",
                        "last_updated": "2026-05-31",
                    },
                )
            ]

        with patch.object(
            self.ingest.knowledge_ops, "file_to_documents", side_effect=fake_file_to_documents
        ), patch.object(
            self.ingest.graph_engine,
            "build_graph",
            return_value={"documents": {}, "entities": {}, "roles": {}},
        ), patch.object(
            self.ingest.graph_engine, "save_graph", return_value=None
        ), patch.object(
            self.ingest.Chroma, "from_documents", return_value=object()
        ):
            self.ingest.main()

        docs_by_file = {
            row["source_file"]: row for row in self.store.list_documents()
        }
        self.assertEqual(
            docs_by_file[confidential_name]["visibility_roles"],
            ["Tax Team"],
        )
        self.assertEqual(
            docs_by_file[confidential_name]["min_clearance"],
            "senior",
        )
        self.assertEqual(docs_by_file[public_name]["visibility_roles"], ["ALL"])
        self.assertEqual(docs_by_file[public_name]["min_clearance"], "standard")


if __name__ == "__main__":
    unittest.main()
