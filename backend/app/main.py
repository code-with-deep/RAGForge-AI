from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.database import DocumentRecord, SessionLocal, init_db
from app.routers import auth, chunks, contact, documents, evaluation, query, system
from app.services.ingestion import DocumentIngestionService


logger = logging.getLogger(__name__)
settings = get_settings()


def _startup_sync() -> None:
    """Synchronous startup tasks — run via asyncio.to_thread to avoid blocking the event loop."""
    init_db()
    if not settings.should_auto_seed_samples:
        return

    db = SessionLocal()
    try:
        shared_count = (
            db.query(DocumentRecord).filter(DocumentRecord.user_id.is_(None)).count()
        )
        # In development, seed when no shared samples exist.
        # With AUTO_INGEST_SAMPLE_DOCS=true, always attempt (idempotent).
        if settings.auto_ingest_sample_docs or shared_count == 0:
            created = DocumentIngestionService(db).ingest_sample_documents()
            if created:
                logger.info("Seeded %s shared sample document(s)", len(created))
            elif shared_count == 0:
                logger.warning("Sample ingest requested but no sample documents were created")
    except Exception:
        logger.exception("Failed to auto-seed sample documents")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    await asyncio.to_thread(_startup_sync)
    yield


app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.parsed_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(documents.router, prefix=settings.api_prefix)
app.include_router(query.router, prefix=settings.api_prefix)
app.include_router(evaluation.router, prefix=settings.api_prefix)
app.include_router(chunks.router, prefix=settings.api_prefix)
app.include_router(contact.router, prefix=settings.api_prefix)
app.include_router(system.router, prefix=settings.api_prefix)
