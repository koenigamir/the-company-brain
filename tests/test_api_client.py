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
            json={"question": "What supports SFDR?"},
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


if __name__ == "__main__":
    unittest.main()
