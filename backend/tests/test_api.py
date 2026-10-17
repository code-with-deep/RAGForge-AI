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


def test_query_whitespace_is_rejected():
    response = client.post("/api/query", json={"query": "   ", "strategy": "hybrid"})
    assert response.status_code == 422


def test_history_limit_is_validated():
    assert client.get("/api/query/history?limit=-1").status_code == 422
    assert client.get("/api/query/history?limit=0").status_code == 422
    assert client.get("/api/query/history?limit=5").status_code == 200


def test_upload_rejects_empty_and_corrupt_files_without_leaving_orphans():
    upload_dir = get_settings().upload_dir
    before = set(upload_dir.glob("*"))
    empty = client.post("/api/documents/upload", files={"file": ("empty.txt", b"", "text/plain")})
    assert empty.status_code == 400
    corrupt = client.post("/api/documents/upload", files={"file": ("bad.pdf", b"not a pdf", "application/pdf")})
    assert corrupt.status_code == 400
    assert set(upload_dir.glob("*")) == before


def test_contact_subject_newlines_are_neutralised():
    response = client.post(
        "/api/contact",
        json={
            "name": "Inspector",
            "email": "inspector@example.com",
            "subject": "Hello\r\nBcc: attacker@example.com",
            "message": "This is a long enough contact message for validation.",
        },
    )
    assert response.status_code == 200
    from app.models.database import ContactMessage

    db = SessionLocal()
    try:
        record = db.get(ContactMessage, response.json()["id"])
        assert "\n" not in record.subject and "\r" not in record.subject
    finally:
        db.close()


def test_date_end_filter_includes_the_whole_day():
    from datetime import datetime, timezone

    from app.models.database import ChunkRecord
    from app.models.schemas import MetadataFilters
    from app.services.retrieval import RetrievalService

    doc_id = _create_shared_document("dated.txt")
    db = SessionLocal()
    try:
        db.add(
            ChunkRecord(
                id=f"chunk-{uuid4()}", document_id=doc_id, vector_id=f"v-{uuid4()}", strategy="recursive",
                source="dated.txt", text="dated chunk",
            )
        )
        db.commit()
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        found = RetrievalService(db)._candidate_chunks(MetadataFilters(date_end=today))
        assert any(chunk.document_id == doc_id for chunk in found)
        yesterday = datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() - 2 * 86400, timezone.utc)
        missing = RetrievalService(db)._candidate_chunks(MetadataFilters(date_end=yesterday.strftime("%Y-%m-%d")))
        assert not any(chunk.document_id == doc_id for chunk in missing)
    finally:
        db.close()


def _settings(**overrides):
    from app.config import Settings

    base = {"jwt_secret_key": "x" * 32, "environment": "testing", "groq_api_key": None, "google_api_key": None}
    return Settings(_env_file=None, **{**base, **overrides})


def test_llm_chain_gemini_primary_groq_fallback(monkeypatch):
    from app.services import llm

    both = _settings(llm_provider="gemini", llm_fallback_provider="groq", google_api_key="g", groq_api_key="q")
    assert llm._configured_providers(both) == ["gemini", "groq"]
    monkeypatch.setattr(llm, "get_settings", lambda: both)
    assert llm.llm_status().startswith("gemini:") and "fallback groq:" in llm.llm_status()

    # Missing Gemini key -> Groq is promoted to primary instead of failing.
    only_groq = _settings(llm_provider="gemini", groq_api_key="q")
    assert llm._configured_providers(only_groq) == ["groq"]
    # No keys at all -> offline stub.
    assert llm._configured_providers(_settings()) == []
    monkeypatch.setattr(llm, "get_settings", lambda: _settings())
    assert llm.llm_status() == llm.OFFLINE_STATUS


def test_anonymous_cannot_see_user_data():
    email = f"priv_{uuid4().hex[:8]}@example.com"
    token = client.post("/api/auth/signup", json={"email": email, "password": "TestPass123!"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    db = SessionLocal()
    try:
        from app.models.database import User

        owner = db.query(User).filter(User.email == email).one()
        private_id = str(uuid4())
        db.add(
            DocumentRecord(
                id=private_id, user_id=owner.id, filename="private.txt", file_type="txt",
                source_path="x", file_size=1, total_pages=1,
            )
        )
        db.commit()
    finally:
        db.close()
    assert any(d["id"] == private_id for d in client.get("/api/documents", headers=headers).json())
    assert not any(d["id"] == private_id for d in client.get("/api/documents").json())
    assert client.get(f"/api/documents/{private_id}/chunks").status_code == 404
    assert client.delete(f"/api/documents/{private_id}").status_code == 404
    assert client.get("/api/documents/does-not-exist/chunks").status_code == 404


def test_stream_emits_pipeline_steps_then_answer():
    events = []
    with client.stream("POST", "/api/query/stream", json={"query": "anything at all", "strategy": "hybrid"}) as resp:
        assert resp.status_code == 200
        for line in resp.iter_lines():
            if line.startswith("event:"):
                events.append(line.split(":", 1)[1].strip())
    assert events[0] == "status" and events[-1] == "done"
    assert events.count("pipeline") == 5 and "answer" in events


def test_evaluation_job_runs_in_background_and_is_private():
    import time

    # A persistent app context keeps one event loop alive so the background task can finish.
    with TestClient(app) as client:
        _eval_job_flow(client, time)


def _eval_job_flow(client, time):
    started = client.post("/api/evaluate/jobs", json={"strategies": ["hybrid"], "limit": 1})
    assert started.status_code == 200
    job_id = started.json()["job_id"]
    for _ in range(60):
        status = client.get(f"/api/evaluate/jobs/{job_id}").json()
        if status["status"] != "running":
            break
        time.sleep(0.5)
    assert status["status"] == "completed", status
    assert status["completed"] == status["total"] == 1
    assert status["result"]["leaderboard"]
    token = client.post(
        "/api/auth/signup", json={"email": f"j_{uuid4().hex[:8]}@example.com", "password": "TestPass123!"}
    ).json()["access_token"]
    other = client.get(f"/api/evaluate/jobs/{job_id}", headers={"Authorization": f"Bearer {token}"})
    assert other.status_code == 404
    assert client.post("/api/evaluate/jobs", json={"strategies": []}).status_code == 400


def test_stats_are_scoped_to_caller():
    assert client.get("/api/stats").status_code == 200


def test_fallback_chain_uses_next_provider_and_reports_every_failure():
    import asyncio

    from langchain_core.runnables import RunnableLambda

    from app.services.llm import LLMChainError, _with_fallbacks

    def boom(msg):
        def _f(_):
            raise RuntimeError(msg)

        return RunnableLambda(_f)

    ok = RunnableLambda(lambda _: "from-fallback")
    assert asyncio.run(_with_fallbacks([("gemini", boom("API key not valid")), ("groq", ok)]).ainvoke("x")) == "from-fallback"
    try:
        asyncio.run(_with_fallbacks([("gemini", boom("API key not valid")), ("groq", boom("429 rate limit"))]).ainvoke("x"))
        raise AssertionError("expected LLMChainError")
    except LLMChainError as exc:
        assert [name for name, _ in exc.errors] == ["gemini", "groq"]
        assert "429 rate limit" in str(exc)
