import unittest
from unittest.mock import Mock, patch


class CompanyBrainApiClientTests(unittest.TestCase):
    def test_query_posts_question_to_backend(self):
        import api_client

        response = Mock()
        response.json.return_value = {"confidence": "High", "summary": "ok"}
        response.raise_for_status.return_value = None

        with patch("api_client.requests.post", return_value=response) as post:
            result = api_client.query_brain_remote(
                "http://backend.local/",
                "What supports SFDR?",
            )

        self.assertEqual(result["confidence"], "High")
        post.assert_called_once_with(
            "http://backend.local/query",
            json={"question": "What supports SFDR?", "history": []},
            timeout=120,
        )

    def test_query_posts_history_to_backend(self):
        import api_client

        response = Mock()
        response.json.return_value = {"confidence": "Medium", "short_answer": "ok"}
        response.raise_for_status.return_value = None

        history = [{"role": "user", "content": "What is FATCA?"}]
        with patch("api_client.requests.post", return_value=response) as post:
            api_client.query_brain_remote(
                "http://backend.local/",
                "And QI?",
                history=history,
            )

        post.assert_called_once_with(
            "http://backend.local/query",
            json={"question": "And QI?", "history": history},
            timeout=120,
        )

    def test_ingest_posts_file_and_optional_owner_to_backend(self):
        import api_client

        response = Mock()
        response.json.return_value = {"ok": True, "chunks": 1}
        response.raise_for_status.return_value = None

        with patch("api_client.requests.post", return_value=response) as post:
            result = api_client.add_file_to_brain_remote(
                "http://backend.local",
                b"hello",
                "note.txt",
                role_owner="Tax Team",
            )

        self.assertTrue(result["ok"])
        _url, kwargs = post.call_args
        self.assertEqual(_url[0], "http://backend.local/ingest")
        self.assertEqual(kwargs["data"], {"role_owner": "Tax Team"})
        self.assertEqual(kwargs["files"]["file"], ("note.txt", b"hello"))
        self.assertEqual(kwargs["timeout"], 300)

    def test_roles_gets_backend_roles(self):
        import api_client

        response = Mock()
        response.json.return_value = {"roles": ["Tax Team"]}
        response.raise_for_status.return_value = None

        with patch("api_client.requests.get", return_value=response) as get:
            roles = api_client.list_roles_remote("http://backend.local")

        self.assertEqual(roles, ["Tax Team"])
        get.assert_called_once_with("http://backend.local/roles", timeout=30)


if __name__ == "__main__":
    unittest.main()
