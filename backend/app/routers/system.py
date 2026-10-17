from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.security import get_user_or_raise_if_required
from app.config import get_settings
from app.models.database import ChunkRecord, DocumentRecord, EvaluationResult, QueryRecord, User, get_db
from app.services.access import apply_document_visibility
from app.models.schemas import HealthResponse, StrategyInfo, RetrievalStrategy
from app.services.llm import llm_status
from app.services.vector_store import get_vector_store


router = APIRouter(tags=["system"])


@router.get("/strategies", response_model=list[StrategyInfo])
async def strategies() -> list[StrategyInfo]:
    return [
        StrategyInfo(
            key=RetrievalStrategy.basic_vector,
            label="Basic Vector",
            description="Dense vector similarity over Chroma chunks.",
        ),
        StrategyInfo(
            key=RetrievalStrategy.hybrid,
            label="Hybrid",
            description="Weighted semantic search plus BM25 merged with Reciprocal Rank Fusion.",
            uses_hybrid=True,
        ),
        StrategyInfo(
            key=RetrievalStrategy.hybrid_rerank,
            label="Hybrid + Re-Rank",
            description="Hybrid top-20 retrieval followed by cross-encoder re-ranking to top-5.",
            uses_hybrid=True,
            uses_rerank=True,
        ),
        StrategyInfo(
            key=RetrievalStrategy.parent_child,
            label="Parent-Child",
            description="Retrieves small child chunks and sends their larger parent chunks to the LLM.",
            uses_hybrid=True,
            uses_rerank=True,
        ),
        StrategyInfo(
            key=RetrievalStrategy.multi_query,
            label="Multi-Query",
            description="Generates multiple query variants and fuses retrieval results.",
            uses_transformation=True,
            uses_hybrid=True,
            uses_rerank=True,
        ),
        StrategyInfo(
            key=RetrievalStrategy.hyde,
            label="HyDE",
            description="Generates a hypothetical answer passage and retrieves by that embedding target.",
            uses_transformation=True,
            uses_hybrid=True,
            uses_rerank=True,
        ),
        StrategyInfo(
            key=RetrievalStrategy.decomposition,
            label="Query Decomposition",
            description="Splits complex questions into atomic sub-queries and fuses evidence.",
            uses_transformation=True,
            uses_hybrid=True,
            uses_rerank=True,
        ),
    ]


@router.get("/stats")
async def stats(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> dict:
    user_id = user.id if user else None
    visible_docs = apply_document_visibility(db.query(DocumentRecord), user_id)
    chunk_query = apply_document_visibility(
        db.query(ChunkRecord.strategy, func.count(ChunkRecord.id)).join(DocumentRecord), user_id
    ).group_by(ChunkRecord.strategy)
    chunk_counts = {strategy: count for strategy, count in chunk_query}

    queries = db.query(QueryRecord).filter(
        QueryRecord.user_id == user_id if user_id else QueryRecord.user_id.is_(None)
    )
    evals = db.query(EvaluationResult).filter(
        EvaluationResult.user_id == user_id if user_id else EvaluationResult.user_id.is_(None)
    )
    eval_counts = {
        strategy: count
        for strategy, count in evals.with_entities(
            EvaluationResult.strategy, func.count(EvaluationResult.id)
        ).group_by(EvaluationResult.strategy)
    }
    avg_latency = queries.with_entities(func.avg(QueryRecord.latency_ms)).scalar() or 0
    return {
        "documents": visible_docs.count(),
        "chunks": sum(chunk_counts.values()),
        "chunks_by_strategy": chunk_counts,
        "queries": queries.count(),
        "average_latency_ms": round(float(avg_latency), 2),
        "evaluations": evals.count(),
        "evaluations_by_strategy": eval_counts,
        "llm": llm_status(),
    }


@router.get("/health", response_model=HealthResponse)
async def health(db: Session = Depends(get_db)) -> HealthResponse:
    settings = get_settings()
    db_status = "ready"
    try:
        db.query(DocumentRecord).count()
    except Exception as exc:
        db_status = f"degraded: {exc}"
    vector_status = "ready"
    try:
        get_vector_store()._collection.count()
    except Exception as exc:
        vector_status = f"degraded: {exc}"
    return HealthResponse(
        status="ok" if db_status == "ready" and vector_status == "ready" else "degraded",
        app=settings.app_name,
        vector_store=vector_status,
        database=db_status,
        llm_provider=llm_status(),
    )
