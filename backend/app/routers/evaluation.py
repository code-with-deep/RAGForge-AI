from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
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
from app.services.eval_jobs import get_job, start_job
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



@router.post("/jobs")
async def start_evaluation_job(
    payload: BatchEvaluationRequest,
    user: User | None = Depends(get_user_or_raise_if_required),
) -> dict:
    """Start a batch evaluation in the background; poll ``GET /evaluate/jobs/{id}``."""
    if not payload.strategies:
        raise HTTPException(status_code=400, detail="Please select at least one retrieval strategy to evaluate.")
    job = start_job(payload, user.id if user else None)
    return {"job_id": job.id, "status": job.status}


@router.get("/jobs/{job_id}")
async def evaluation_job_status(
    job_id: str,
    user: User | None = Depends(get_user_or_raise_if_required),
) -> dict:
    job = get_job(job_id, user.id if user else None)
    if job is None:
        raise HTTPException(status_code=404, detail="Evaluation job not found.")
    return {
        "job_id": job.id,
        "status": job.status,
        "completed": job.completed,
        "total": job.total,
        "error": job.error,
        "result": job.result.model_dump() if job.result else None,
    }
