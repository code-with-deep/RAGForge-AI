"""In-memory background jobs for batch evaluation (one HTTP request per benchmark is too long)."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from uuid import uuid4

from fastapi import HTTPException

from app.models.database import SessionLocal
from app.models.schemas import BatchEvaluationRequest, BatchEvaluationResponse
from app.services.evaluator import EvaluationService

logger = logging.getLogger(__name__)
MAX_JOBS = 20


@dataclass
class EvalJob:
    id: str
    user_id: str | None
    status: str = "running"  # running | completed | failed
    completed: int = 0
    total: int = 0
    error: str | None = None
    result: BatchEvaluationResponse | None = None
    task: asyncio.Task | None = field(default=None, repr=False)


_JOBS: dict[str, EvalJob] = {}


def start_job(request: BatchEvaluationRequest, user_id: str | None) -> EvalJob:
    job = EvalJob(id=str(uuid4()), user_id=user_id)
    _JOBS[job.id] = job
    while len(_JOBS) > MAX_JOBS:  # drop the oldest finished jobs first
        oldest = next((j for j in _JOBS.values() if j.status != "running"), None)
        if oldest is None:
            break
        _JOBS.pop(oldest.id, None)
    job.task = asyncio.create_task(_run(job, request))
    return job


def get_job(job_id: str, user_id: str | None) -> EvalJob | None:
    job = _JOBS.get(job_id)
    return job if job is not None and job.user_id == user_id else None


async def _run(job: EvalJob, request: BatchEvaluationRequest) -> None:
    def progress(done: int, total: int) -> None:
        job.completed, job.total = done, total

    db = SessionLocal()  # request-scoped sessions are closed by the time this runs
    try:
        job.result = await EvaluationService(db).evaluate_batch(
            request, user_id=job.user_id, progress=progress
        )
        job.status = "completed"
    except HTTPException as exc:
        job.status, job.error = "failed", str(exc.detail)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Evaluation job %s failed", job.id)
        job.status, job.error = "failed", f"Evaluation failed: {exc}"
    finally:
        db.close()
