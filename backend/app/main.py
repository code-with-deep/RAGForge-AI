from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.models.database import DocumentRecord, SessionLocal, init_db
from app.routers import auth, chunks, contact, documents, evaluation, query, system
from app.services.ingestion import DocumentIngestionService


logger = logging.getLogger(__name__)
settings = get_settings()


def _format_validation_error(err: dict) -> str:
    loc = err.get("loc", ())
    field = str(loc[-1]) if loc and loc[-1] != "body" else ""
    field_name = field.replace("_", " ").capitalize() if field else "Input"
    msg = err.get("msg", "Invalid value")
    if msg.startswith("Value error, "):
        msg = msg[len("Value error, ") :]
    if err.get("type") == "missing":
        return f"{field_name} is required."
    return f"{field_name}: {msg}."


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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:  # noqa: ARG001
    errors = [_format_validation_error(err) for err in exc.errors()]
    readable_detail = " ".join(errors) if errors else "Invalid request parameters."
    return JSONResponse(
        status_code=422,
        content={"detail": readable_detail, "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error processing request %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again shortly or contact support."},
    )


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {
        "app": settings.app_name,
        "status": "ready",
        "docs_url": "/docs",
        "api_prefix": settings.api_prefix,
    }


app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(documents.router, prefix=settings.api_prefix)
app.include_router(query.router, prefix=settings.api_prefix)
app.include_router(evaluation.router, prefix=settings.api_prefix)
app.include_router(chunks.router, prefix=settings.api_prefix)
app.include_router(contact.router, prefix=settings.api_prefix)
app.include_router(system.router, prefix=settings.api_prefix)
