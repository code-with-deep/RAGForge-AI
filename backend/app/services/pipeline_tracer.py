from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Any, Iterator

from app.models.schemas import PipelineStep


class PipelineTracer:
    def __init__(self) -> None:
        self.steps: list[PipelineStep] = []
        self.latency: dict[str, float] = {}

    @contextmanager
    def step(self, name: str, details: dict[str, Any] | None = None) -> Iterator[dict[str, Any]]:
        started = time.perf_counter()
        payload = details or {}
        status = "completed"
        try:
            yield payload
        except Exception as exc:
            status = "failed"
            payload["error"] = str(exc)
            raise
        finally:
            elapsed = round((time.perf_counter() - started) * 1000, 2)
            self.latency[name] = elapsed
            self.steps.append(
                PipelineStep(name=name, status=status, latency_ms=elapsed, details=payload)
            )

