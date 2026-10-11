"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { getPipeline } from "@/lib/api";
import type { QueryResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { PipelineVisualizer } from "@/components/PipelineVisualizer";
import { useAppStore } from "@/store/useAppStore";

function PipelineContent() {
  const latest = useAppStore((state) => state.latestQuery);
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id") ?? "";
  const [queryId, setQueryId] = useState(urlId || (latest?.query_id ?? ""));
  const [remote, setRemote] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const result = remote ?? latest;

  const load = useCallback(async (id?: string) => {
    const target = (id ?? queryId).trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const payload = await getPipeline(target);
      const data = payload as Record<string, unknown>;
      const base: QueryResponse =
        latest ?? {
          query_id: "",
          original_query: "",
          strategy: "hybrid_rerank",
          transformed_queries: [],
          answer: "",
          retrieved_chunks: [],
          selected_chunks: [],
          final_prompt: "",
          token_usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, context_tokens: 0 },
          latency_ms: 0,
          latency: {},
          pipeline: [],
          debugging: {}
        };
      setRemote({
        ...base,
        query_id: String(data.query_id),
        original_query: String(data.original_query),
        strategy: String(data.strategy) as QueryResponse["strategy"],
        pipeline: data.pipeline as QueryResponse["pipeline"],
        final_prompt: String(data.final_prompt),
        answer: String(data.answer),
        token_usage: data.token_usage as QueryResponse["token_usage"],
        latency: data.latency as QueryResponse["latency"],
        latency_ms: base.latency_ms,
        transformed_queries: base.transformed_queries,
        retrieved_chunks: base.retrieved_chunks,
        selected_chunks: base.selected_chunks,
        debugging: base.debugging
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the pipeline for this query ID. Please check the ID or select a query from your history."
      );
    } finally {
      setLoading(false);
    }
  }, [queryId, latest]);

  // Auto-load when navigated from history page with ?id=
  useEffect(() => {
    if (urlId) load(urlId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlId]);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipeline Visualizer</h1>
        <p className="mt-1 text-sm text-muted-foreground">Inspect the full processing pipeline for any query</p>
      </div>
      <Panel>
        <PanelHeader>
          <PanelTitle>Query ID</PanelTitle>
          <Button onClick={() => load()} disabled={!queryId.trim() || loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Loading..." : "Load"}
          </Button>
        </PanelHeader>
        <div className="space-y-3">
          <Input
            value={queryId}
            onChange={(e) => {
              setQueryId(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste a query ID..."
          />
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
      </Panel>
      <PipelineVisualizer result={result} />
    </div>
  );
}

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
      <PipelineContent />
    </Suspense>
  );
}
