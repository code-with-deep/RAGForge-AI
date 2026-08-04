"""API smoke tests that run without an external LLM or embedding downloads."""

from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

_TEST_ROOT = Path(__file__).resolve().parent / "_tmp"
_TEST_ROOT.mkdir(exist_ok=True)
_DB = _TEST_ROOT / f"test-{uuid4().hex}.db"

os.environ.update(
    {
        "ENVIRONMENT": "testing",
        "DATABASE_URL": f"sqlite:///{_DB.as_posix()}",
        "JWT_SECRET_KEY": "pytest-secret-key-not-for-production-use",
        "LLM_PROVIDER": "offline",
        "OFFLINE_FALLBACK": "true",
        "AUTH_REQUIRED": "false",
        "AUTO_INGEST_SAMPLE_DOCS": "false",
        "CORS_ORIGINS": "http://localhost:3000",
        "GROQ_API_KEY": "",
    }
)

from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.models.database import DocumentRecord, SessionLocal, init_db  # noqa: E402


init_db()
client = TestClient(app)


def _create_shared_document(filename: str = "shared-sample.txt") -> str:
    doc_id = str(uuid4())
    db = SessionLocal()
    try:
        db.add(
            DocumentRecord(
                id=doc_id,
                user_id=None,
                filename=filename,
                file_type="txt",
                source_path=str(_TEST_ROOT / filename),
                file_size=12,
                total_pages=1,
                tags_json='["sample","shared"]',
                chunk_counts_json='{"recursive":1}',
            )
        )
        db.commit()
    finally:
        db.close()
    return doc_id


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "llm_provider" in body


def test_strategies():
    response = client.get("/api/strategies")
    assert response.status_code == 200
    keys = {item["key"] for item in response.json()}
    assert "hybrid_rerank" in keys
    assert len(keys) == 7


def test_auth_flow_and_shared_document_visibility():
    email = f"user_{uuid4().hex[:8]}@example.com"
    password = "TestPass123!"
    shared_id = _create_shared_document()

    signup = client.post("/api/auth/signup", json={"email": email, "password": password})
    assert signup.status_code == 200
    token = signup.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = client.get("/api/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == email.lower()

    bad = client.post("/api/auth/login", json={"email": email, "password": "wrong-pass"})
    assert bad.status_code == 401

    docs = client.get("/api/documents", headers=headers)
    assert docs.status_code == 200
    payload = docs.json()
    assert any(doc["id"] == shared_id for doc in payload)
    shared = next(doc for doc in payload if doc["id"] == shared_id)
    assert shared["is_shared"] is True

    deleted = client.delete(f"/api/documents/{shared_id}", headers=headers)
    assert deleted.status_code == 403


def test_contact_persists():
    response = client.post(
        "/api/contact",
        json={
            "name": "Inspector",
            "email": "inspector@example.com",
            "subject": "Hello",
            "message": "This is a long enough contact message for validation.",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["id"]
    assert body["delivered"] is False


def test_query_validation():
    response = client.post("/api/query", json={"query": "a", "strategy": "hybrid"})
    assert response.status_code == 422
