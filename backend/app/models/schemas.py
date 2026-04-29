from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class RetrievalStrategy(str, Enum):
    basic_vector = "basic_vector"
    hybrid = "hybrid"
    hybrid_rerank = "hybrid_rerank"
    parent_child = "parent_child"
    multi_query = "multi_query"
    hyde = "hyde"
    decomposition = "decomposition"


class FilterLogic(str, Enum):
    and_ = "and"
    or_ = "or"


class MetadataFilters(BaseModel):
    sources: list[str] = Field(default_factory=list)
    page_start: int | None = None
    page_end: int | None = None
    sections: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    chunk_strategies: list[str] = Field(default_factory=list)
    date_start: str | None = Field(default=None, description="ISO date string lower bound for upload_date")
    date_end: str | None = Field(default=None, description="ISO date string upper bound for upload_date")
    logic: FilterLogic = FilterLogic.and_


class TokenUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    context_tokens: int = 0


class PipelineStep(BaseModel):
    name: str
    status: str = "completed"
    latency_ms: float = 0
    details: dict[str, Any] = Field(default_factory=dict)


class ChunkScore(BaseModel):
    id: str
    document_id: str | None = None
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    rank: int
    original_rank: int | None = None
    rerank_rank: int | None = None
    vector_score: float | None = None
    bm25_score: float | None = None
    rrf_score: float | None = None
    rerank_score: float | None = None
    retrieval_query: str | None = None


class QueryRequest(BaseModel):
    query: str = Field(min_length=2)
    strategy: RetrievalStrategy = RetrievalStrategy.hybrid_rerank
    filters: MetadataFilters = Field(default_factory=MetadataFilters)
    semantic_weight: float = Field(default=0.7, ge=0, le=1)
    keyword_weight: float = Field(default=0.3, ge=0, le=1)
    top_k_initial: int = Field(default=20, ge=1, le=50)
    top_k_final: int = Field(default=5, ge=1, le=20)
    enable_step_back: bool = False


class QueryResponse(BaseModel):
    query_id: str
    original_query: str
    strategy: RetrievalStrategy
    transformed_queries: list[str]
    answer: str
    retrieved_chunks: list[ChunkScore]
    selected_chunks: list[ChunkScore]
    final_prompt: str
    token_usage: TokenUsage
    latency_ms: float
    latency: dict[str, float] = Field(default_factory=dict)
    pipeline: list[PipelineStep]
    debugging: dict[str, Any] = Field(default_factory=dict)


class CompareRequest(BaseModel):
    query: str = Field(min_length=2)
    strategy_a: RetrievalStrategy = RetrievalStrategy.hybrid
    strategy_b: RetrievalStrategy = RetrievalStrategy.hybrid_rerank
    filters: MetadataFilters = Field(default_factory=MetadataFilters)
    semantic_weight: float = Field(default=0.7, ge=0, le=1)
    keyword_weight: float = Field(default=0.3, ge=0, le=1)
    top_k_initial: int = Field(default=20, ge=1, le=50)
    top_k_final: int = Field(default=5, ge=1, le=20)


class CompareResponse(BaseModel):
    query: str
    result_a: QueryResponse
    result_b: QueryResponse
    overlap_chunk_ids: list[str]
    metrics: dict[str, Any]


class DocumentOut(BaseModel):
    id: str
    filename: str
    file_type: str
    upload_date: datetime
    file_size: int
    total_pages: int
    tags: list[str]
    chunk_counts: dict[str, int]


class UploadResponse(BaseModel):
    document: DocumentOut
    chunks_created: int
    chunk_counts: dict[str, int]


class ChunkOut(BaseModel):
    id: str
    document_id: str
    strategy: str
    source: str
    page_number: int | None
    section: str | None
    tags: list[str]
    text: str
    token_count: int
    metadata: dict[str, Any] = Field(default_factory=dict)


class StrategyInfo(BaseModel):
    key: RetrievalStrategy
    label: str
    description: str
    uses_transformation: bool = False
    uses_hybrid: bool = False
    uses_rerank: bool = False


class EvaluationItem(BaseModel):
    question: str
    reference_answer: str
    expected_context: list[str] = Field(default_factory=list)
    strategy: RetrievalStrategy = RetrievalStrategy.hybrid_rerank
    filters: MetadataFilters = Field(default_factory=MetadataFilters)


class EvaluationScores(BaseModel):
    faithfulness: float
    answer_relevancy: float
    context_precision: float
    context_recall: float
    aggregate: float


class EvaluationResponse(BaseModel):
    id: str
    query_id: str | None
    strategy: RetrievalStrategy
    question: str
    answer: str
    reference_answer: str
    scores: EvaluationScores
    passed: bool
    failure_analysis: list[str] = Field(default_factory=list)


class BatchEvaluationRequest(BaseModel):
    strategies: list[RetrievalStrategy] = Field(
        default_factory=lambda: [
            RetrievalStrategy.basic_vector,
            RetrievalStrategy.hybrid,
            RetrievalStrategy.hybrid_rerank,
            RetrievalStrategy.parent_child,
            RetrievalStrategy.multi_query,
            RetrievalStrategy.hyde,
            RetrievalStrategy.decomposition,
        ]
    )
    limit: int | None = Field(default=None, ge=1, le=30)


class BatchEvaluationResponse(BaseModel):
    results: list[EvaluationResponse]
    leaderboard: list[dict[str, Any]]
    metric_averages: dict[str, dict[str, float]]


class EvaluationResultOut(BaseModel):
    id: str
    strategy: str
    question: str
    answer: str
    reference_answer: str
    scores: dict[str, float]
    passed: bool
    created_at: datetime


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime


class HealthResponse(BaseModel):
    status: str
    app: str
    vector_store: str
    database: str
    llm_provider: str

