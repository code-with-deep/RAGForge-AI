import type {
  BatchEvaluationResponse,
  ChunkOut,
  CompareResponse,
  DocumentOut,
  QueryHistoryItem,
  QueryRequest,
  QueryResponse,
  RetrievalStrategy,
  StrategyInfo,
  UserOut
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ragforge-token");
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        // FastAPI validation error array → join messages
        message = body.detail.map((e: { msg?: string }) => e.msg ?? "").join(", ");
      } else if (typeof body?.detail !== "undefined") {
        message = JSON.stringify(body.detail);
      }
    } catch {
      message = (await response.text().catch(() => "")) || message;
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

/* ── Auth ─────────────────────────────────── */
export async function login(email: string, password: string) {
  return apiFetch<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function signup(email: string, password: string) {
  return apiFetch<{ access_token: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function fetchMe() {
  return apiFetch<UserOut>("/auth/me");
}

/* ── Documents ────────────────────────────── */
export function listStrategies() {
  return apiFetch<StrategyInfo[]>("/strategies");
}

export function listDocuments() {
  return apiFetch<DocumentOut[]>("/documents");
}

export function ingestSamples() {
  return apiFetch("/documents/ingest-samples", { method: "POST" });
}

export function uploadDocument(file: File, tags: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("tags", tags);
  return apiFetch("/documents/upload", { method: "POST", body: form });
}

export function deleteDocument(id: string) {
  return apiFetch(`/documents/${id}`, { method: "DELETE" });
}

export function documentChunks(id: string, strategy?: string) {
  const query = strategy ? `?strategy=${encodeURIComponent(strategy)}` : "";
  return apiFetch<ChunkOut[]>(`/documents/${id}/chunks${query}`);
}

/* ── Query ────────────────────────────────── */
export function ask(payload: QueryRequest) {
  return apiFetch<QueryResponse>("/query", { method: "POST", body: JSON.stringify(payload) });
}

export function compare(query: string, strategyA: RetrievalStrategy, strategyB: RetrievalStrategy, payload: QueryRequest) {
  return apiFetch<CompareResponse>("/query/compare", {
    method: "POST",
    body: JSON.stringify({
      query,
      strategy_a: strategyA,
      strategy_b: strategyB,
      filters: payload.filters,
      semantic_weight: payload.semantic_weight,
      keyword_weight: payload.keyword_weight,
      top_k_initial: payload.top_k_initial,
      top_k_final: payload.top_k_final
    })
  });
}

export function getPipeline(id: string) {
  return apiFetch<QueryResponse | Record<string, unknown>>(`/query/${id}/pipeline`);
}

export function getQueryChunks(id: string) {
  return apiFetch(`/query/${id}/chunks`);
}

export function queryHistory(limit: number = 50) {
  return apiFetch<QueryHistoryItem[]>(`/query/history?limit=${limit}`);
}

/* ── Evaluation ───────────────────────────── */
export function evaluateBatch(strategies: RetrievalStrategy[], limit?: number) {
  return apiFetch<BatchEvaluationResponse>("/evaluate/batch", {
    method: "POST",
    body: JSON.stringify({ strategies, limit })
  });
}

export function evaluationResults() {
  return apiFetch("/evaluate/results");
}

/* ── System ───────────────────────────────── */
export function stats() {
  return apiFetch<Record<string, unknown>>("/stats");
}

export function health() {
  return apiFetch<Record<string, unknown>>("/health");
}
