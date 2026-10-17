from __future__ import annotations

import math
import threading

from app.config import get_settings
from app.models.schemas import ChunkScore
from app.services.utils import normalize_scores, tokenize


# RAGChainService (and so CrossEncoderReranker) is built per request; the model must
# outlive it or every query pays a multi-second reload.
_MODEL_LOCK = threading.Lock()
_MODEL_CACHE: dict[str, object] = {}
_MODEL_ERRORS: dict[str, str] = {}


def _get_cross_encoder(model_name: str):
    with _MODEL_LOCK:
        if model_name in _MODEL_CACHE:
            return _MODEL_CACHE[model_name]
        if model_name in _MODEL_ERRORS:
            raise RuntimeError(_MODEL_ERRORS[model_name])
        try:
            from sentence_transformers import CrossEncoder

            _MODEL_CACHE[model_name] = CrossEncoder(model_name)
        except Exception as exc:
            _MODEL_ERRORS[model_name] = str(exc)
            raise
        return _MODEL_CACHE[model_name]


class CrossEncoderReranker:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._load_error: str | None = None

    def rerank(self, query: str, chunks: list[ChunkScore], *, top_k: int) -> tuple[list[ChunkScore], str]:
        if not chunks:
            return [], "No chunks available for re-ranking."
        scores, mode = self._cross_encoder_scores(query, chunks)
        if scores is None:
            scores = self._lexical_scores(query, chunks)
            mode = mode or "lexical-overlap-fallback"
        normalized = normalize_scores(scores)
        reranked: list[ChunkScore] = []
        for chunk, score in zip(chunks, normalized):
            updated = chunk.model_copy(deep=True)
            updated.rerank_score = round(float(score), 6)
            updated.original_rank = chunk.original_rank or chunk.rank
            reranked.append(updated)
        reranked.sort(key=lambda item: item.rerank_score or 0, reverse=True)
        for index, chunk in enumerate(reranked, start=1):
            chunk.rank = index
            chunk.rerank_rank = index
        return reranked[:top_k], mode

    def _cross_encoder_scores(
        self, query: str, chunks: list[ChunkScore]
    ) -> tuple[list[float] | None, str | None]:
        if not self.settings.enable_cross_encoder:
            return None, "cross-encoder-disabled"
        try:
            model = _get_cross_encoder(self.settings.reranker_model)
            pairs = [(query, chunk.text) for chunk in chunks]
            raw = model.predict(pairs)
            scores = [float(score) for score in raw]
            return [1.0 / (1.0 + math.exp(-score)) for score in scores], "cross-encoder"
        except Exception as exc:
            self._load_error = str(exc)
            return None, f"cross-encoder-unavailable: {exc}"

    def _lexical_scores(self, query: str, chunks: list[ChunkScore]) -> list[float]:
        query_terms = set(tokenize(query))
        if not query_terms:
            return [0.0 for _ in chunks]
        scores: list[float] = []
        for chunk in chunks:
            terms = set(tokenize(chunk.text))
            overlap = len(query_terms.intersection(terms))
            scores.append(overlap / max(1, len(query_terms)))
        return scores

