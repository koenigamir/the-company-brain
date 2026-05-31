from __future__ import annotations

import importlib
import os
import tempfile
import unittest


class StoreAccessTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["COMPANY_BRAIN_STORE_DIR"] = self.tmp.name
        import store

        self.store = importlib.reload(store)

    def tearDown(self):
        self.tmp.cleanup()

    def test_demo_accounts_seed_exact_registry(self):
        ids = [account["id"] for account in self.store.list_demo_accounts()]
        self.assertEqual(
            ids,
            [
                "intern-general",
                "standard-employee",
                "senior-leader",
                "esg-compliance-senior",
                "master-data-ops-senior",
                "tax-team-senior",
                "regulatory-services-senior",
                "product-coverage-onboarding-senior",
                "compliance-sanctions-senior",
            ],
        )

    def test_unknown_demo_account_falls_back_to_standard_employee(self):
        account = self.store.get_demo_account("missing-account")
        self.assertEqual(account["id"], "standard-employee")
        self.assertEqual(account["clearance"], "standard")

    def test_document_visibility_respects_clearance_and_department(self):
        tax_confidential = {
            "source_file": "Confidential_tax_policy.txt",
            "visibility_roles": ["Tax Team"],
            "min_clearance": "senior",
        }
        general_standard = {
            "source_file": "General_policy.txt",
            "visibility_roles": ["ALL"],
            "min_clearance": "standard",
        }

        self.assertFalse(
            self.store.document_is_visible(
                tax_confidential, self.store.get_demo_account("intern-general")
            )
        )
        self.assertTrue(
            self.store.document_is_visible(
                general_standard, self.store.get_demo_account("standard-employee")
            )
        )
        self.assertTrue(
            self.store.document_is_visible(
                tax_confidential, self.store.get_demo_account("senior-leader")
            )
        )
        self.assertTrue(
            self.store.document_is_visible(
                tax_confidential, self.store.get_demo_account("tax-team-senior")
            )
        )
        self.assertFalse(
            self.store.document_is_visible(
                tax_confidential,
                self.store.get_demo_account("esg-compliance-senior"),
            )
        )

    def test_upsert_document_persists_access_fields(self):
        self.store.upsert_document(
            "Confidential_tax_policy.txt",
            "Tax Team",
            "2026-05-31",
            3,
            modality="document",
            role_owners=["Tax Team"],
            visibility_roles=["Tax Team"],
            min_clearance="senior",
        )

        docs = self.store.list_documents()
        self.assertEqual(len(docs), 1)
        self.assertEqual(docs[0]["visibility_roles"], ["Tax Team"])
        self.assertEqual(docs[0]["min_clearance"], "senior")


if __name__ == "__main__":
    unittest.main()
