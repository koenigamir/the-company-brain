from __future__ import annotations

import unittest

import graph_engine


class GraphEngineTests(unittest.TestCase):
    def test_detect_entities_matches_sustainability_variants(self):
        self.assertIn(
            "EU Taxonomy / ESG",
            graph_engine.detect_entities("What are the sustainability rules here?"),
        )
        self.assertIn(
            "EU Taxonomy / ESG",
            graph_engine.detect_entities("How does sustainable investing map to ESG?"),
        )


if __name__ == "__main__":
    unittest.main()
