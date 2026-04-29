export type RetrievalStrategy =
  | "basic_vector"
  | "hybrid"
  | "hybrid_rerank"
  | "parent_child"
  | "multi_query"
  | "hyde"
  | "decomposition";

export type MetadataFilters = {
  sources: string[];
  page_start?: number | null;
  page_end?: number | null;
  sections: string[];
  tags: string[];
  chunk_strategies: string[];
  date_start?: string | null;
  date_end?: string | null;
  logic: "and" | "or";
};

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  context_tokens: number;
};

export type ChunkScore = {
  id: string;
  document_id?: string | null;
  text: string;
  metadata: Record<string, unknown>;
  rank: number;
  original_rank?: number | null;
  rerank_rank?: number | null;
  vector_score?: number | null;
  bm25_score?: number | null;
  rrf_score?: number | null;
  rerank_score?: number | null;
  retrieval_query?: string | null;
};

export type PipelineStep = {
  name: string;
  status: string;
  latency_ms: number;
  details: Record<string, unknown>;
};

export type QueryResponse = {
  query_id: string;
  original_query: string;
  strategy: RetrievalStrategy;
  transformed_queries: string[];
  answer: string;
  retrieved_chunks: ChunkScore[];
  selected_chunks: ChunkScore[];
  final_prompt: string;
  token_usage: TokenUsage;
  latency_ms: number;
  latency: Record<string, number>;
  pipeline: PipelineStep[];
  debugging: Record<string, unknown>;
};

export type QueryRequest = {
  query: string;
  strategy: RetrievalStrategy;
  filters: MetadataFilters;
  semantic_weight: number;
  keyword_weight: number;
  top_k_initial: number;
  top_k_final: number;
  enable_step_back: boolean;
};

export type CompareResponse = {
  query: string;
  result_a: QueryResponse;
  result_b: QueryResponse;
  overlap_chunk_ids: string[];
  metrics: Record<string, unknown>;
};

export type DocumentOut = {
  id: string;
  filename: string;
  file_type: string;
  upload_date: string;
  file_size: number;
  total_pages: number;
  tags: string[];
  chunk_counts: Record<string, number>;
};

export type ChunkOut = {
  id: string;
  document_id: string;
  strategy: string;
  source: string;
  page_number?: number | null;
  section?: string | null;
  tags: string[];
  text: string;
  token_count: number;
  metadata: Record<string, unknown>;
};

export type StrategyInfo = {
  key: RetrievalStrategy;
  label: string;
  description: string;
  uses_transformation: boolean;
  uses_hybrid: boolean;
  uses_rerank: boolean;
};

export type EvaluationScores = {
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
  aggregate: number;
};

export type EvaluationResponse = {
  id: string;
  query_id?: string | null;
  strategy: RetrievalStrategy;
  question: string;
  answer: string;
  reference_answer: string;
  scores: EvaluationScores;
  passed: boolean;
  failure_analysis: string[];
};

export type BatchEvaluationResponse = {
  results: EvaluationResponse[];
  leaderboard: Array<Record<string, number | string>>;
  metric_averages: Record<string, Record<string, number>>;
};

export type UserOut = {
  id: string;
  email: string;
  created_at: string;
};

export type QueryHistoryItem = {
  id: string;
  original_query: string;
  strategy: string;
  latency_ms: number;
  created_at: string;
};
