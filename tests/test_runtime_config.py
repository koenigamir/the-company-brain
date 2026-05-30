import importlib
import os
import unittest


class RuntimeConfigTests(unittest.TestCase):
    def test_graph_path_comes_from_environment(self):
        os.environ["COMPANY_BRAIN_GRAPH_PATH"] = "/tmp/company-brain-test/graph.json"

        import graph_engine

        importlib.reload(graph_engine)
        self.assertEqual(
            graph_engine.GRAPH_PATH,
            "/tmp/company-brain-test/graph.json",
        )


if __name__ == "__main__":
    unittest.main()
