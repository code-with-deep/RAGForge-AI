from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from app.auth.security import get_user_or_raise_if_required
from app.models.database import QueryRecord, User, get_db
from app.models.schemas import CompareRequest, CompareResponse, QueryRequest, QueryResponse
from app.services.rag_chain import RAGChainService
from app.services.utils import from_json


router = APIRouter(prefix="/query", tags=["query"])


@router.post("", response_model=QueryResponse)
async def query(
    payload: QueryRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> QueryResponse:
    return await RAGChainService(db).run_query(payload, user_id=user.id if user else None)


@router.post("/compare", response_model=CompareResponse)
async def compare(
    payload: CompareRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> CompareResponse:
    return await RAGChainService(db).compare(payload, user_id=user.id if user else None)


@router.post("/stream")
async def stream_query(
    payload: QueryRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> EventSourceResponse:
    """SSE: one ``pipeline`` event per step as it finishes, then ``answer`` and ``done``."""

    async def events():
        yield {"event": "status", "data": json.dumps({"step": "started"})}
        queue: asyncio.Queue = asyncio.Queue()
        try:
            service = RAGChainService(db)
        except HTTPException as exc:
            yield {"event": "error", "data": json.dumps({"status": exc.status_code, "detail": exc.detail})}
            return
        task = asyncio.create_task(
            service.run_query(payload, user_id=user.id if user else None, on_step=queue.put_nowait)
        )
        try:
            while True:
                getter = asyncio.ensure_future(queue.get())
                await asyncio.wait({getter, task}, return_when=asyncio.FIRST_COMPLETED)
                if getter.done():
                    yield {"event": "pipeline", "data": getter.result().model_dump_json()}
                    continue
                getter.cancel()
                break
            while not queue.empty():
                yield {"event": "pipeline", "data": queue.get_nowait().model_dump_json()}
            try:
                response = task.result()
            except HTTPException as exc:
                yield {"event": "error", "data": json.dumps({"status": exc.status_code, "detail": exc.detail})}
                return
            except Exception:
                yield {"event": "error", "data": json.dumps({"status": 500, "detail": "An unexpected server error occurred."})}
                return
            yield {"event": "answer", "data": response.model_dump_json()}
            yield {"event": "done", "data": json.dumps({"query_id": response.query_id})}
        finally:
            if not task.done():
                task.cancel()

    return EventSourceResponse(events())


@router.get("/history")
async def query_history(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> list[dict]:
    query = db.query(QueryRecord).order_by(QueryRecord.created_at.desc())
    query = query.filter(_owner_clause(user.id if user else None))
    records = query.limit(limit).all()
    return [
        {
            "id": r.id,
            "original_query": r.original_query,
            "strategy": r.strategy,
            "latency_ms": r.latency_ms,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in records
    ]


@router.get("/{query_id}/pipeline")
async def get_pipeline(
    query_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> dict:
    record = _get_query_record(db, query_id, user.id if user else None)
    return {
        "query_id": query_id,
        "original_query": record.original_query,
        "strategy": record.strategy,
        "pipeline": from_json(record.pipeline_json, []),
        "final_prompt": record.prompt,
        "token_usage": from_json(record.token_usage_json, {}),
        "latency": from_json(record.latency_json, {}),
        "answer": record.answer,
    }


@router.get("/{query_id}/chunks")
async def get_query_chunks(
    query_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> dict:
    record = _get_query_record(db, query_id, user.id if user else None)
    return {
        "query_id": query_id,
        "retrieved_chunks": from_json(record.retrieved_chunks_json, []),
        "selected_chunks": from_json(record.selected_chunks_json, []),
    }


def _owner_clause(user_id: str | None):
    # Anonymous callers (AUTH_REQUIRED=false) only ever see anonymous records.
    return QueryRecord.user_id == user_id if user_id else QueryRecord.user_id.is_(None)


def _get_query_record(db: Session, query_id: str, user_id: str | None) -> QueryRecord:
    query = db.query(QueryRecord).filter(QueryRecord.id == query_id).filter(_owner_clause(user_id))
    record = query.first()
    if record is None:
        raise HTTPException(
            status_code=404,
            detail="The requested query record was not found or you do not have permission to access it.",
        )
    return record

