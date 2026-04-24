from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.database import SessionLocal, init_db
from app.routers import auth, chunks, documents, evaluation, query, system
from app.services.ingestion import DocumentIngestionService


settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0")

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


@app.on_event("startup")
def startup() -> None:
    init_db()
    if settings.auto_ingest_sample_docs:
        db = SessionLocal()
        try:
            DocumentIngestionService(db).ingest_sample_documents()
        finally:
            db.close()

