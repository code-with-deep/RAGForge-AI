from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth.security import get_user_or_raise_if_required
from app.models.database import User, get_db
from app.models.schemas import ChunkScore, MetadataFilters
from app.services.retrieval import RetrievalService


router = APIRouter(prefix="/chunks", tags=["chunks"])


@router.get("/search", response_model=list[ChunkScore])
async def search_chunks(
    q: str = Query(..., min_length=2),
    strategy: str | None = None,
    source: str | None = None,
    top_k: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> list[ChunkScore]:
    filters = MetadataFilters(
        sources=[source] if source else [],
        chunk_strategies=[strategy] if strategy else [],
    )
    chunks, _ = RetrievalService(db).retrieve_hybrid(
        q,
        filters,
        top_k=top_k,
        semantic_weight=0.7,
        keyword_weight=0.3,
        user_id=user.id if user else None,
    )
    return chunks

