from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.database import SessionLocal, init_db
from app.routers import auth, chunks, documents, evaluation, query, system
from app.services.ingestion import DocumentIngestionService


settings = get_settings()


def _startup_sync() -> None:
    """Synchronous startup tasks — run via asyncio.to_thread to avoid blocking the event loop."""
    init_db()
    if settings.auto_ingest_sample_docs:
        db = SessionLocal()
        try:
            DocumentIngestionService(db).ingest_sample_documents()
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    await asyncio.to_thread(_startup_sync)
    yield  # application runs here
    # (add shutdown cleanup here if needed in future)


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
app.include_router(system.router, prefix=settings.api_prefix)

