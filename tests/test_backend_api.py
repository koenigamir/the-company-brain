from __future__ import annotations

import asyncio
import importlib
import sys
import types
import unittest
from unittest.mock import patch

from tests.backend_test_support import install_backend_stubs


install_backend_stubs()


class BackendApiTests(unittest.TestCase):
    def setUp(self):
        import backend.api

        self.api = importlib.reload(backend.api)

    def test_demo_accounts_endpoint_returns_seeded_accounts(self):
        fake_store = types.SimpleNamespace(
            list_demo_accounts=lambda: [{"id": "intern-general"}],
            backend_name=lambda: "local",
        )
        with patch.dict(sys.modules, {"store": fake_store}):
            result = self.api.demo_accounts()

        self.assertEqual(result["accounts"], [{"id": "intern-general"}])
        self.assertEqual(result["backend"], "local")

    def test_query_forwards_viewer_account_id(self):
        calls = {}

        def query_brain(question, history=None, viewer_account_id=None):
            calls["question"] = question
            calls["history"] = history
            calls["viewer_account_id"] = viewer_account_id
            return {"ok": True}

        fake_rag = types.SimpleNamespace(query_brain=query_brain)
        request = self.api.QueryRequest(
            question="Who sees this?",
            history=[{"role": "user", "content": "Earlier"}],
            viewer_account_id="intern-general",
        )
        with patch.dict(sys.modules, {"rag_engine": fake_rag}):
            result = self.api.query(request)

        self.assertTrue(result["ok"])
        self.assertEqual(calls["viewer_account_id"], "intern-general")

    def test_query_defaults_viewer_account_id_to_standard_employee(self):
        calls = {}

        def query_brain(question, history=None, viewer_account_id=None):
            calls["viewer_account_id"] = viewer_account_id
            return {"ok": True}

        fake_rag = types.SimpleNamespace(query_brain=query_brain)
        request = self.api.QueryRequest(question="Who sees this?")
        with patch.dict(sys.modules, {"rag_engine": fake_rag}):
            self.api.query(request)

        self.assertEqual(calls["viewer_account_id"], "standard-employee")

    def test_ingest_accepts_visibility_roles_and_min_clearance(self):
        calls = {}

        def add_file_to_brain(
            file_bytes,
            filename,
            role_owner=None,
            visibility_roles=None,
            min_clearance=None,
        ):
            calls["file_bytes"] = file_bytes
            calls["filename"] = filename
            calls["role_owner"] = role_owner
            calls["visibility_roles"] = visibility_roles
            calls["min_clearance"] = min_clearance
            return {"ok": True}

        fake_rag = types.SimpleNamespace(add_file_to_brain=add_file_to_brain)
        upload = self.api.UploadFile(filename="note.txt", content=b"hello")
        with patch.dict(sys.modules, {"rag_engine": fake_rag}):
            result = asyncio.run(
                self.api.ingest(
                    file=upload,
                    role_owner="Tax Team",
                    visibility_roles=["Tax Team"],
                    min_clearance="senior",
                )
            )

        self.assertTrue(result["ok"])
        self.assertEqual(calls["visibility_roles"], ["Tax Team"])
        self.assertEqual(calls["min_clearance"], "senior")

    def test_ingest_rejects_invalid_min_clearance(self):
        upload = self.api.UploadFile(filename="note.txt", content=b"hello")

        with self.assertRaises(self.api.HTTPException) as ctx:
            asyncio.run(
                self.api.ingest(
                    file=upload,
                    role_owner="Tax Team",
                    visibility_roles=["Tax Team"],
                    min_clearance="executive",
                )
            )

        self.assertEqual(ctx.exception.status_code, 400)

    def test_documents_endpoint_returns_access_metadata(self):
        fake_store = types.SimpleNamespace(
            list_documents=lambda: [
                {
                    "source_file": "Confidential_tax_policy.txt",
                    "visibility_roles": ["Tax Team"],
                    "min_clearance": "senior",
                }
            ]
        )
        with patch.dict(sys.modules, {"store": fake_store}):
            result = self.api.documents()

        self.assertEqual(
            result["documents"][0]["visibility_roles"],
            ["Tax Team"],
        )
        self.assertEqual(result["documents"][0]["min_clearance"], "senior")


if __name__ == "__main__":
    unittest.main()
