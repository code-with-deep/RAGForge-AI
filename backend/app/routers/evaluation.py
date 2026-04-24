from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.security import get_user_or_raise_if_required
from app.models.database import User, get_db
from app.models.schemas import (
    BatchEvaluationRequest,
    BatchEvaluationResponse,
    EvaluationItem,
    EvaluationResponse,
    EvaluationResultOut,
)
from app.services.evaluator import EvaluationService


router = APIRouter(prefix="/evaluate", tags=["evaluation"])


@router.post("", response_model=EvaluationResponse)
async def evaluate(
    payload: EvaluationItem,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> EvaluationResponse:
    return await EvaluationService(db).evaluate_item(payload, user_id=user.id if user else None)


@router.post("/batch", response_model=BatchEvaluationResponse)
async def evaluate_batch(
    payload: BatchEvaluationRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> BatchEvaluationResponse:
    return await EvaluationService(db).evaluate_batch(payload, user_id=user.id if user else None)


@router.get("/results", response_model=list[EvaluationResultOut])
async def evaluation_results(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> list[EvaluationResultOut]:
    return EvaluationService(db).list_results(user_id=user.id if user else None)

