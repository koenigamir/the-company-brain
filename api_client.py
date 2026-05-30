"""HTTP client helpers for talking to the Company Brain backend API."""

from __future__ import annotations

from urllib.parse import urljoin

import requests


def _endpoint(base_url: str, path: str) -> str:
    return urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))


def query_brain_remote(base_url: str, question: str, history=None) -> dict:
    response = requests.post(
        _endpoint(base_url, "/query"),
        json={"question": question, "history": history or []},
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


def list_roles_remote(base_url: str) -> list[str]:
    response = requests.get(_endpoint(base_url, "/roles"), timeout=30)
    response.raise_for_status()
    data = response.json()
    return data.get("roles", [])


def send_gap_ticket_remote(
    base_url: str,
    question: str,
    gap: dict,
    body: str,
    missing_topics=None,
) -> dict:
    response = requests.post(
        _endpoint(base_url, "/gap-ticket"),
        json={
            "question": question,
            "gap": gap or {},
            "body": body,
            "missing_topics": missing_topics or [],
        },
        timeout=60,
    )
    response.raise_for_status()
    return response.json()
