from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.database import ChunkRecord, DocumentRecord, EvaluationResult, QueryRecord, get_db
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
async def stats(db: Session = Depends(get_db)) -> dict:
    chunk_counts = defaultdict(int)
    for strategy, count in db.query(ChunkRecord.strategy, func.count(ChunkRecord.id)).group_by(ChunkRecord.strategy):
        chunk_counts[strategy] = count
    eval_counts = defaultdict(int)
    for strategy, count in (
        db.query(EvaluationResult.strategy, func.count(EvaluationResult.id)).group_by(EvaluationResult.strategy)
    ):
        eval_counts[strategy] = count
    avg_latency = db.query(func.avg(QueryRecord.latency_ms)).scalar() or 0
    return {
        "documents": db.query(DocumentRecord).count(),
        "chunks": db.query(ChunkRecord).count(),
        "chunks_by_strategy": dict(chunk_counts),
        "queries": db.query(QueryRecord).count(),
        "average_latency_ms": round(float(avg_latency), 2),
        "evaluations": db.query(EvaluationResult).count(),
        "evaluations_by_strategy": dict(eval_counts),
        "llm": llm_status(),
    }


@router.get("/health", response_model=HealthResponse)
async def health(db: Session = Depends(get_db)) -> HealthResponse:
    settings = get_settings()
    db.query(DocumentRecord).count()
    vector_status = "ready"
    try:
        get_vector_store()._collection.count()
    except Exception as exc:
        vector_status = f"degraded: {exc}"
    return HealthResponse(
        status="ok",
        app=settings.app_name,
        vector_store=vector_status,
        database="ready",
        llm_provider=llm_status(),
    )
