import type {
  BatchEvaluationResponse,
  ChunkOut,
  ChunkScore,
  CompareResponse,
  DocumentOut,
  QueryHistoryItem,
  QueryRequest,
  QueryResponse,
  RetrievalStrategy,
  StrategyInfo,
  UserOut
} from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers, cache: "no-store" });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (
      errorMsg.includes("Failed to fetch") ||
      errorMsg.includes("NetworkError") ||
      errorMsg.includes("Load failed") ||
      errorMsg.includes("ECONNREFUSED")
    ) {
      throw new Error(
        "Unable to connect to the RAGForge server. Please make sure the backend is running and reachable."
      );
    }
    throw new Error(errorMsg || "Network request failed. Please check your connection.");
  }

  if (!response.ok) {
    // A rejected token means the session expired: sign out so AuthGuard sends the user to /login.
    if (response.status === 401 && token && !path.startsWith("/auth/login") && !path.startsWith("/auth/signup")) {
      useAppStore.getState().setToken(null);
      useAppStore.getState().setUser(null);
    }
    let message = response.statusText || `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body?.detail)) {
        // Format FastAPI validation errors into human-readable field sentences
        const formatted = body.detail.map((e: { msg?: string; loc?: (string | number)[] }) => {
          const field = e.loc && e.loc.length > 0 ? e.loc[e.loc.length - 1] : null;
          const fieldLabel =
            field && typeof field === "string" && field !== "body"
              ? `${field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, " ")}: `
              : "";
          let rawMsg = e.msg ?? "Invalid input";
          if (rawMsg.startsWith("Value error, ")) {
            rawMsg = rawMsg.replace("Value error, ", "");
          }
          return `${fieldLabel}${rawMsg}`;
        });
        message = formatted.filter(Boolean).join(". ");
      } else if (body?.message && typeof body.message === "string") {
        message = body.message;
      } else if (typeof body?.detail !== "undefined") {
        message = JSON.stringify(body.detail);
      }
    } catch {
      const text = await response.text().catch(() => "");
      if (text) message = text;
    }

    // Fallbacks for generic or empty error messages
    if (response.status === 401 && (!message || message === "Unauthorized")) {
      message = "Invalid email or password, or your session has expired.";
    } else if (response.status === 403 && (!message || message === "Forbidden")) {
      message = "You do not have permission to perform this action.";
    } else if (response.status === 404 && (!message || message === "Not Found")) {
      message = "The requested resource was not found.";
    } else if (response.status === 500 && (!message || message === "Internal Server Error")) {
      message = "A server error occurred. Please try again shortly.";
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
  return apiFetch<{ query_id: string; retrieved_chunks: ChunkScore[]; selected_chunks: ChunkScore[] }>(
    `/query/${id}/chunks`
  );
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

export type EvaluationJobStatus = {
  job_id: string;
  status: "running" | "completed" | "failed";
  completed: number;
  total: number;
  error: string | null;
  result: BatchEvaluationResponse | null;
};

export function startEvaluationJob(strategies: RetrievalStrategy[], limit?: number) {
  return apiFetch<{ job_id: string; status: string }>("/evaluate/jobs", {
    method: "POST",
    body: JSON.stringify({ strategies, limit })
  });
}

export function getEvaluationJob(jobId: string) {
  return apiFetch<EvaluationJobStatus>(`/evaluate/jobs/${jobId}`);
}

export function evaluationResults() {
  return apiFetch("/evaluate/results");
}

/* ── Contact ──────────────────────────────── */
export function submitContact(payload: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) {
  return apiFetch<{ status: string; id: string; delivered: boolean; detail: string }>("/contact", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/* ── System ───────────────────────────────── */
export function stats() {
  return apiFetch<Record<string, unknown>>("/stats");
}

export function health() {
  return apiFetch<Record<string, unknown>>("/health");
}
