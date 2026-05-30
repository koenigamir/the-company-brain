"""HTTP client helpers for talking to the Company Brain backend API."""

from __future__ import annotations

from urllib.parse import urljoin

import requests


def _endpoint(base_url: str, path: str) -> str:
    return urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def query_brain_remote(base_url: str, question: str) -> dict:
    response = requests.post(
        _endpoint(base_url, "/query"),
        json={"question": question},
        timeout=120,
    )
    response.raise_for_status()
    return response.json()


def add_file_to_brain_remote(
    base_url: str,
    file_bytes: bytes,
    filename: str,
    role_owner: str | None = None,
) -> dict:
    data = {}
    if role_owner:
        data["role_owner"] = role_owner

    response = requests.post(
        _endpoint(base_url, "/ingest"),
        files={"file": (filename, file_bytes)},
        data=data,
        timeout=300,
    )
    response.raise_for_status()
    return response.json()
