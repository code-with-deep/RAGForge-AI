from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from rank_bm25 import BM25Okapi
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.config import get_settings
from app.models.database import ChunkRecord, DocumentRecord
from app.models.schemas import ChunkScore, MetadataFilters
from app.services.ingestion import SEARCHABLE_STRATEGIES
from app.services.utils import (
    from_json,
    normalize_scores,
    reciprocal_rank,
    tokenize,
)
from app.services.vector_store import get_vector_store


@dataclass
class RetrievalDebug:
    eligible_chunks: int
    vector_hits: int
    bm25_hits: int
    fused_hits: int
    notes: list[str]


class RetrievalService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    def retrieve_basic_vector(
        self,
        query: str,
        filters: MetadataFilters,
        *,
        top_k: int,
        user_id: str | None = None,
    ) -> tuple[list[ChunkScore], RetrievalDebug]:
        candidates = self._candidate_chunks(filters, user_id=user_id)
        eligible = {record.id for record in candidates}
        vector_results = self._vector_search(query, filters, top_k=max(top_k * 4, 40), eligible=eligible)
        ranked = vector_results[:top_k]
        for index, result in enumerate(ranked, start=1):
            result.rank = index
            result.original_rank = index
            result.retrieval_query = query
        return ranked, RetrievalDebug(len(candidates), len(vector_results), 0, len(ranked), [])

    def retrieve_hybrid(
        self,
        query: str,
        filters: MetadataFilters,
        *,
        top_k: int,
        semantic_weight: float,
        keyword_weight: float,
        user_id: str | None = None,
    ) -> tuple[list[ChunkScore], RetrievalDebug]:
        candidates = self._candidate_chunks(filters, user_id=user_id)
        eligible = {record.id for record in candidates}
        notes: list[str] = []
        if not candidates:
            return [], RetrievalDebug(0, 0, 0, 0, ["No chunks matched the metadata filters."])

        vector_results = self._vector_search(query, filters, top_k=max(top_k * 4, 80), eligible=eligible)
        bm25_results = self._bm25_search(query, candidates, top_k=max(top_k * 4, 80))
        fused = self._rrf_fuse(
            vector_results,
            bm25_results,
            semantic_weight=semantic_weight,
            keyword_weight=keyword_weight,
        )
        if not vector_results:
            notes.append("Vector search returned no candidates after filtering.")
        if not bm25_results:
            notes.append("BM25 returned no candidates after filtering.")
        ranked = fused[:top_k]
        for index, result in enumerate(ranked, start=1):
            result.rank = index
            result.original_rank = index
            result.retrieval_query = query
        return ranked, RetrievalDebug(
            eligible_chunks=len(candidates),
            vector_hits=len(vector_results),
            bm25_hits=len(bm25_results),
            fused_hits=len(ranked),
            notes=notes,
        )

    def retrieve_parent_child(
        self,
        query: str,
        filters: MetadataFilters,
        *,
        top_k: int,
        semantic_weight: float,
        keyword_weight: float,
        user_id: str | None = None,
    ) -> tuple[list[ChunkScore], RetrievalDebug]:
        parent_filters = filters.model_copy(deep=True)
        parent_filters.chunk_strategies = ["parent_child"]
        child_results, debug = self.retrieve_hybrid(
            query,
            parent_filters,
            top_k=top_k * 3,
            semantic_weight=semantic_weight,
            keyword_weight=keyword_weight,
            user_id=user_id,
        )
        inflated = self._inflate_parent_context(child_results, top_k=top_k)
        debug.fused_hits = len(inflated)
        if not inflated:
            debug.notes.append("No parent chunks could be resolved from child retrieval.")
        return inflated, debug

    def fuse_result_sets(
        self,
        result_sets: Iterable[list[ChunkScore]],
        *,
        top_k: int,
    ) -> list[ChunkScore]:
        merged: dict[str, ChunkScore] = {}
        score_totals: dict[str, float] = {}
        for result_set in result_sets:
            for rank, result in enumerate(result_set, start=1):
                current = merged.get(result.id)
                contribution = reciprocal_rank(rank, self.settings.rrf_k)
                if current is None:
                    clone = result.model_copy(deep=True)
                    clone.rrf_score = contribution + (clone.rrf_score or 0)
                    merged[clone.id] = clone
                    score_totals[clone.id] = clone.rrf_score or contribution
                else:
                    current.vector_score = max_score(current.vector_score, result.vector_score)
                    current.bm25_score = max_score(current.bm25_score, result.bm25_score)
                    current.rerank_score = max_score(current.rerank_score, result.rerank_score)
                    if result.retrieval_query and result.retrieval_query not in (current.retrieval_query or ""):
                        current.retrieval_query = (
                            f"{current.retrieval_query or ''} | {result.retrieval_query}"
                        ).strip(" |")
                    score_totals[current.id] = score_totals.get(current.id, 0) + contribution
                    current.rrf_score = score_totals[current.id]
        ranked = sorted(merged.values(), key=lambda item: item.rrf_score or 0, reverse=True)[:top_k]
        for index, result in enumerate(ranked, start=1):
            result.rank = index
            result.original_rank = result.original_rank or index
        return ranked

    def _candidate_chunks(
        self,
        filters: MetadataFilters,
        *,
        user_id: str | None = None,
    ) -> list[ChunkRecord]:
        query = self.db.query(ChunkRecord).join(DocumentRecord)

        # --- DB-level filters (pushed into SQL) ---
        if user_id:
            query = query.filter(DocumentRecord.user_id == user_id)
        if filters.date_start:
            try:
                dt_start = datetime.fromisoformat(filters.date_start)
                if dt_start.tzinfo is None:
                    dt_start = dt_start.replace(tzinfo=timezone.utc)
                query = query.filter(DocumentRecord.upload_date >= dt_start)
            except ValueError:
                pass  # malformed date — skip filter rather than crash
        if filters.date_end:
            try:
                dt_end = datetime.fromisoformat(filters.date_end)
                if dt_end.tzinfo is None:
                    dt_end = dt_end.replace(tzinfo=timezone.utc)
                query = query.filter(DocumentRecord.upload_date <= dt_end)
            except ValueError:
                pass  # malformed date — skip filter rather than crash

        # strategy / source / page filters — all indexed columns
        strategies = filters.chunk_strategies or sorted(SEARCHABLE_STRATEGIES)
        query = query.filter(ChunkRecord.strategy.in_(strategies))

        if filters.sources:
            query = query.filter(ChunkRecord.source.in_(filters.sources))
        if filters.page_start is not None:
            query = query.filter(
                ChunkRecord.page_number.isnot(None),
                ChunkRecord.page_number >= filters.page_start,
            )
        if filters.page_end is not None:
            query = query.filter(
                ChunkRecord.page_number.isnot(None),
                ChunkRecord.page_number <= filters.page_end,
            )

        # sections — case-insensitive substring match
        if filters.sections:
            section_clauses = [
                ChunkRecord.section.ilike(f"%{s}%") for s in filters.sections
            ]
            section_filter = or_(*section_clauses)
            query = query.filter(section_filter)

        # tags — stored as JSON text, use LIKE per tag
        if filters.tags:
            tag_clauses = [
                ChunkRecord.tags_json.ilike(f"%{tag.lower()}%")
                for tag in filters.tags
            ]
            if filters.logic.value == "or" and len(tag_clauses) > 1:
                query = query.filter(or_(*tag_clauses))
            else:
                query = query.filter(and_(*tag_clauses))

        return query.all()

    def _vector_search(
        self,
        query: str,
        filters: MetadataFilters,
        *,
        top_k: int,
        eligible: set[str],
    ) -> list[ChunkScore]:
        if not eligible:
            return []
        chroma_filter = self._simple_chroma_filter(filters)
        try:
            docs_with_scores = get_vector_store().similarity_search_with_score(
                query,
                k=top_k,
                filter=chroma_filter,
            )
        except Exception:
            docs_with_scores = get_vector_store().similarity_search_with_score(query, k=top_k)

        results: list[ChunkScore] = []
        for doc, distance in docs_with_scores:
            chunk_id = str(doc.metadata.get("chunk_id") or "")
            if chunk_id not in eligible:
                continue
            record = self.db.get(ChunkRecord, chunk_id)
            if not record:
                continue
            similarity = 1.0 / (1.0 + float(distance))
            results.append(self._record_to_score(record, vector_score=round(similarity, 6)))

        deduped: dict[str, ChunkScore] = {}
        for result in results:
            current = deduped.get(result.id)
            if current is None or (result.vector_score or 0) > (current.vector_score or 0):
                deduped[result.id] = result
        ranked = sorted(deduped.values(), key=lambda item: item.vector_score or 0, reverse=True)
        for index, result in enumerate(ranked, start=1):
            result.rank = index
            result.original_rank = index
        return ranked

    def _bm25_search(
        self,
        query: str,
        candidates: list[ChunkRecord],
        *,
        top_k: int,
    ) -> list[ChunkScore]:
        tokenized_docs = [tokenize(record.text) for record in candidates]
        tokenized_query = tokenize(query)
        if not tokenized_docs or not tokenized_query:
            return []
        model = BM25Okapi(tokenized_docs)
        raw_scores = list(model.get_scores(tokenized_query))
        normalized = normalize_scores(raw_scores)
        ranked_indices = sorted(
            range(len(candidates)),
            key=lambda idx: (normalized[idx], raw_scores[idx]),
            reverse=True,
        )[:top_k]
        results: list[ChunkScore] = []
        for rank, idx in enumerate(ranked_indices, start=1):
            result = self._record_to_score(
                candidates[idx],
                bm25_score=round(normalized[idx], 6),
            )
            result.rank = rank
            result.original_rank = rank
            results.append(result)
        return results

    def _rrf_fuse(
        self,
        vector_results: list[ChunkScore],
        bm25_results: list[ChunkScore],
        *,
        semantic_weight: float,
        keyword_weight: float,
    ) -> list[ChunkScore]:
        by_id: dict[str, ChunkScore] = {}
        vector_rank = {result.id: rank for rank, result in enumerate(vector_results, start=1)}
        bm25_rank = {result.id: rank for rank, result in enumerate(bm25_results, start=1)}
        for result in vector_results + bm25_results:
            current = by_id.get(result.id)
            if current is None:
                current = result.model_copy(deep=True)
                by_id[result.id] = current
            else:
                current.vector_score = max_score(current.vector_score, result.vector_score)
                current.bm25_score = max_score(current.bm25_score, result.bm25_score)
            current.rrf_score = round(
                reciprocal_rank(vector_rank.get(result.id), self.settings.rrf_k, semantic_weight)
                + reciprocal_rank(bm25_rank.get(result.id), self.settings.rrf_k, keyword_weight),
                8,
            )
            current.original_rank = min(
                rank for rank in [vector_rank.get(result.id), bm25_rank.get(result.id)] if rank
            )
        ranked = sorted(by_id.values(), key=lambda item: item.rrf_score or 0, reverse=True)
        for index, result in enumerate(ranked, start=1):
            result.rank = index
        return ranked

    def _inflate_parent_context(self, child_results: list[ChunkScore], *, top_k: int) -> list[ChunkScore]:
        seen: set[str] = set()
        parents: list[ChunkScore] = []
        for child in child_results:
            parent_id = child.metadata.get("parent_id")
            if not parent_id or parent_id in seen:
                continue
            parent_record = self.db.get(ChunkRecord, str(parent_id))
            if not parent_record:
                continue
            parent_score = self._record_to_score(
                parent_record,
                vector_score=child.vector_score,
                bm25_score=child.bm25_score,
                rrf_score=child.rrf_score,
            )
            parent_score.original_rank = child.original_rank
            parent_score.metadata["matched_child_id"] = child.id
            parent_score.metadata["matched_child_text"] = child.text
            parent_score.metadata["strategy"] = "parent_child"
            parent_score.retrieval_query = child.retrieval_query
            parents.append(parent_score)
            seen.add(str(parent_id))
            if len(parents) >= top_k:
                break
        for index, parent in enumerate(parents, start=1):
            parent.rank = index
        return parents

    def _record_to_score(
        self,
        record: ChunkRecord,
        *,
        vector_score: float | None = None,
        bm25_score: float | None = None,
        rrf_score: float | None = None,
    ) -> ChunkScore:
        metadata = from_json(record.metadata_json, {})
        metadata.update(
            {
                "source": record.source,
                "page_number": record.page_number,
                "section": record.section,
                "strategy": record.strategy,
                "tags": from_json(record.tags_json, []),
                "parent_id": record.parent_id,
            }
        )
        return ChunkScore(
            id=record.id,
            document_id=record.document_id,
            text=record.text,
            metadata=metadata,
            rank=0,
            vector_score=vector_score,
            bm25_score=bm25_score,
            rrf_score=rrf_score,
        )

    def _simple_chroma_filter(self, filters: MetadataFilters) -> dict | None:
        if filters.logic.value != "and":
            return None
        clauses: list[dict] = []
        if len(filters.sources) == 1:
            clauses.append({"source": filters.sources[0]})
        if len(filters.chunk_strategies) == 1:
            clauses.append({"strategy": filters.chunk_strategies[0]})
        if filters.page_start is not None and filters.page_end is not None:
            clauses.append({"page_number": {"$gte": filters.page_start}})
            clauses.append({"page_number": {"$lte": filters.page_end}})
        if not clauses:
            return None
        if len(clauses) == 1:
            return clauses[0]
        return {"$and": clauses}


def max_score(left: float | None, right: float | None) -> float | None:
    if left is None:
        return right
    if right is None:
        return left
    return max(left, right)
