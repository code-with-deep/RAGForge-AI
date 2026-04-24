from __future__ import annotations

import time
from uuid import uuid4

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.database import QueryRecord
from app.models.schemas import (
    ChunkScore,
    CompareRequest,
    CompareResponse,
    QueryRequest,
    QueryResponse,
    RetrievalStrategy,
    TokenUsage,
)
from app.services.llm import get_chat_model
from app.services.pipeline_tracer import PipelineTracer
from app.services.query_transform import QueryTransformService
from app.services.reranker import CrossEncoderReranker
from app.services.retrieval import RetrievalDebug, RetrievalService
from app.services.utils import estimate_tokens, snippet, to_json


class RAGChainService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.retrieval = RetrievalService(db)
        self.transforms = QueryTransformService()
        self.reranker = CrossEncoderReranker()
        self.llm = get_chat_model()
        self.prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are RAGForge AI, a precise retrieval-augmented assistant. "
                    "Answer only from the supplied context. If the context is insufficient, say what is missing. "
                    "Cite sources using [source page/section chunk_id] when possible.",
                ),
                (
                    "human",
                    "Context:\n{context}\n\nQuestion: {question}\n\nAnswer with concise reasoning and citations.",
                ),
            ]
        )
        self.chain = self.prompt | self.llm | StrOutputParser()

    async def run_query(self, request: QueryRequest, user_id: str | None = None) -> QueryResponse:
        started = time.perf_counter()
        tracer = PipelineTracer()
        transformed_queries: list[str] = [request.query]
        retrieval_debug: list[RetrievalDebug] = []

        with tracer.step("query_transformation") as details:
            transformed_queries = await self._transform_queries(request)
            details["original_query"] = request.query
            details["transformed_queries"] = transformed_queries
            details["strategy"] = request.strategy.value
            details["step_back_enabled"] = request.enable_step_back

        with tracer.step("retrieval") as details:
            retrieved_chunks, retrieval_debug = await self._retrieve_for_strategy(
                request,
                transformed_queries,
                user_id=user_id,
            )
            details["top_k_initial"] = request.top_k_initial
            details["retrieved_count"] = len(retrieved_chunks)
            details["chunks"] = [self._chunk_trace(chunk) for chunk in retrieved_chunks[:20]]
            details["debug"] = [debug.__dict__ for debug in retrieval_debug]

        with tracer.step("reranking") as details:
            if self._should_rerank(request.strategy):
                selected_chunks, mode = self.reranker.rerank(
                    request.query, retrieved_chunks[: request.top_k_initial], top_k=request.top_k_final
                )
            else:
                selected_chunks = retrieved_chunks[: request.top_k_final]
                mode = "not-requested"
            details["mode"] = mode
            details["selected_count"] = len(selected_chunks)
            details["rank_changes"] = [
                {
                    "chunk_id": chunk.id,
                    "original_rank": chunk.original_rank,
                    "new_rank": chunk.rank,
                    "rerank_score": chunk.rerank_score,
                }
                for chunk in selected_chunks
            ]

        with tracer.step("context_assembly") as details:
            context = self._assemble_context(selected_chunks)
            context_tokens = estimate_tokens(context)
            details["context_tokens"] = context_tokens
            details["selected_chunks"] = [self._chunk_trace(chunk) for chunk in selected_chunks]

        with tracer.step("llm_generation") as details:
            prompt_value = self.prompt.invoke({"context": context, "question": request.query})
            final_prompt = prompt_value.to_string()
            answer = await self.chain.ainvoke({"context": context, "question": request.query})
            details["prompt_preview"] = snippet(final_prompt, 900)
            details["answer_preview"] = snippet(answer, 500)

        total_latency = round((time.perf_counter() - started) * 1000, 2)
        token_usage = TokenUsage(
            input_tokens=estimate_tokens(final_prompt),
            output_tokens=estimate_tokens(answer),
            context_tokens=estimate_tokens(context),
        )
        token_usage.total_tokens = token_usage.input_tokens + token_usage.output_tokens
        debugging = self._debugging_payload(retrieval_debug, selected_chunks)

        query_id = str(uuid4())
        record = QueryRecord(
            id=query_id,
            user_id=user_id,
            original_query=request.query,
            strategy=request.strategy.value,
            answer=answer,
            prompt=final_prompt,
            transformed_queries_json=to_json(transformed_queries),
            retrieved_chunks_json=to_json([chunk.model_dump() for chunk in retrieved_chunks]),
            selected_chunks_json=to_json([chunk.model_dump() for chunk in selected_chunks]),
            pipeline_json=to_json([step.model_dump() for step in tracer.steps]),
            token_usage_json=token_usage.model_dump_json(),
            latency_json=to_json(tracer.latency),
            latency_ms=total_latency,
        )
        self.db.add(record)
        self.db.commit()

        return QueryResponse(
            query_id=query_id,
            original_query=request.query,
            strategy=request.strategy,
            transformed_queries=transformed_queries,
            answer=answer,
            retrieved_chunks=retrieved_chunks,
            selected_chunks=selected_chunks,
            final_prompt=final_prompt,
            token_usage=token_usage,
            latency_ms=total_latency,
            latency=tracer.latency,
            pipeline=tracer.steps,
            debugging=debugging,
        )

    async def compare(self, request: CompareRequest, user_id: str | None = None) -> CompareResponse:
        common = {
            "query": request.query,
            "filters": request.filters,
            "semantic_weight": request.semantic_weight,
            "keyword_weight": request.keyword_weight,
            "top_k_initial": request.top_k_initial,
            "top_k_final": request.top_k_final,
        }
        result_a = await self.run_query(QueryRequest(strategy=request.strategy_a, **common), user_id=user_id)
        result_b = await self.run_query(QueryRequest(strategy=request.strategy_b, **common), user_id=user_id)
        ids_a = {chunk.id for chunk in result_a.selected_chunks}
        ids_b = {chunk.id for chunk in result_b.selected_chunks}
        overlap = sorted(ids_a.intersection(ids_b))
        metrics = {
            "latency_delta_ms": round(result_b.latency_ms - result_a.latency_ms, 2),
            "token_delta": result_b.token_usage.total_tokens - result_a.token_usage.total_tokens,
            "overlap_ratio": round(len(overlap) / max(1, len(ids_a.union(ids_b))), 4),
            "strategy_a_chunks": len(result_a.selected_chunks),
            "strategy_b_chunks": len(result_b.selected_chunks),
        }
        return CompareResponse(
            query=request.query,
            result_a=result_a,
            result_b=result_b,
            overlap_chunk_ids=overlap,
            metrics=metrics,
        )

    async def _transform_queries(self, request: QueryRequest) -> list[str]:
        strategy = request.strategy
        queries = [request.query]
        if strategy == RetrievalStrategy.multi_query:
            queries = await self.transforms.multi_query(request.query)
        elif strategy == RetrievalStrategy.decomposition:
            queries = await self.transforms.decompose(request.query)
        elif strategy == RetrievalStrategy.hyde:
            hypothetical = await self.transforms.hyde_document(request.query)
            queries = [hypothetical]
        if request.enable_step_back:
            queries.append(await self.transforms.step_back(request.query))
        return queries

    async def _retrieve_for_strategy(
        self,
        request: QueryRequest,
        transformed_queries: list[str],
        *,
        user_id: str | None,
    ) -> tuple[list[ChunkScore], list[RetrievalDebug]]:
        strategy = request.strategy
        debug: list[RetrievalDebug] = []
        if strategy == RetrievalStrategy.basic_vector:
            chunks, info = self.retrieval.retrieve_basic_vector(
                request.query,
                request.filters,
                top_k=request.top_k_initial,
                user_id=user_id,
            )
            return chunks, [info]
        if strategy == RetrievalStrategy.parent_child:
            chunks, info = self.retrieval.retrieve_parent_child(
                request.query,
                request.filters,
                top_k=request.top_k_initial,
                semantic_weight=request.semantic_weight,
                keyword_weight=request.keyword_weight,
                user_id=user_id,
            )
            return chunks, [info]
        if strategy in {RetrievalStrategy.multi_query, RetrievalStrategy.hyde, RetrievalStrategy.decomposition}:
            result_sets: list[list[ChunkScore]] = []
            for query in transformed_queries:
                chunks, info = self.retrieval.retrieve_hybrid(
                    query,
                    request.filters,
                    top_k=request.top_k_initial,
                    semantic_weight=request.semantic_weight,
                    keyword_weight=request.keyword_weight,
                    user_id=user_id,
                )
                result_sets.append(chunks)
                debug.append(info)
            return self.retrieval.fuse_result_sets(result_sets, top_k=request.top_k_initial), debug

        chunks, info = self.retrieval.retrieve_hybrid(
            request.query,
            request.filters,
            top_k=request.top_k_initial,
            semantic_weight=request.semantic_weight,
            keyword_weight=request.keyword_weight,
            user_id=user_id,
        )
        return chunks, [info]

    def _should_rerank(self, strategy: RetrievalStrategy) -> bool:
        return strategy in {
            RetrievalStrategy.hybrid_rerank,
            RetrievalStrategy.parent_child,
            RetrievalStrategy.multi_query,
            RetrievalStrategy.hyde,
            RetrievalStrategy.decomposition,
        }

    def _assemble_context(self, chunks: list[ChunkScore]) -> str:
        parts: list[str] = []
        used_tokens = 0
        for chunk in chunks:
            metadata = chunk.metadata
            header = (
                f"[{metadata.get('source', 'unknown')} "
                f"page={metadata.get('page_number') or 'n/a'} "
                f"section={metadata.get('section') or 'n/a'} "
                f"chunk_id={chunk.id}]"
            )
            body = f"{header}\n{chunk.text.strip()}"
            tokens = estimate_tokens(body)
            if used_tokens + tokens > self.settings.max_context_tokens and parts:
                break
            parts.append(body)
            used_tokens += tokens
        if not parts:
            return "No retrieved context matched the query and filters."
        return "\n\n---\n\n".join(parts)

    def _chunk_trace(self, chunk: ChunkScore) -> dict:
        return {
            "id": chunk.id,
            "rank": chunk.rank,
            "original_rank": chunk.original_rank,
            "rerank_rank": chunk.rerank_rank,
            "source": chunk.metadata.get("source"),
            "page_number": chunk.metadata.get("page_number"),
            "section": chunk.metadata.get("section"),
            "strategy": chunk.metadata.get("strategy"),
            "vector_score": chunk.vector_score,
            "bm25_score": chunk.bm25_score,
            "rrf_score": chunk.rrf_score,
            "rerank_score": chunk.rerank_score,
            "preview": snippet(chunk.text),
        }

    def _debugging_payload(
        self,
        debug: list[RetrievalDebug],
        selected_chunks: list[ChunkScore],
    ) -> dict:
        notes = [note for item in debug for note in item.notes]
        if not selected_chunks:
            notes.append("No chunks were selected for generation. Check filters or ingest documents.")
        low_scores = [
            chunk.id
            for chunk in selected_chunks
            if (chunk.rerank_score is not None and chunk.rerank_score < 0.25)
            or (chunk.rrf_score is not None and chunk.rrf_score < 0.005)
        ]
        if low_scores:
            notes.append(f"Low-confidence chunks selected: {', '.join(low_scores[:5])}")
        return {
            "notes": notes,
            "retrieval": [item.__dict__ for item in debug],
            "selected_chunk_ids": [chunk.id for chunk in selected_chunks],
        }

