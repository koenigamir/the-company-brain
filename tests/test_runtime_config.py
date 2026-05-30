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

    def test_store_dir_comes_from_environment(self):
        os.environ["COMPANY_BRAIN_STORE_DIR"] = "/tmp/company-brain-test/store"

        import store

        importlib.reload(store)
        self.assertEqual(store.LOCAL_DIR, "/tmp/company-brain-test/store")


if __name__ == "__main__":
    unittest.main()
