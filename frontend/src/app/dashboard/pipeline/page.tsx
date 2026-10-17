"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { getPipeline, getQueryChunks } from "@/lib/api";
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
      // Build everything from the stored record for this ID — never from the latest
      // query, which would mix another query's chunks/latency into this pipeline.
      const [payload, chunks] = await Promise.all([getPipeline(target), getQueryChunks(target)]);
      const data = payload as Record<string, unknown>;
      const pipeline = (data.pipeline ?? []) as QueryResponse["pipeline"];
      const latency = (data.latency ?? {}) as QueryResponse["latency"];
      const transformed = pipeline.find((step) => step.name === "query_transformation")?.details
        ?.transformed_queries;
      setRemote({
        query_id: String(data.query_id),
        original_query: String(data.original_query),
        strategy: String(data.strategy) as QueryResponse["strategy"],
        transformed_queries: Array.isArray(transformed) ? (transformed as string[]) : [],
        answer: String(data.answer),
        retrieved_chunks: chunks.retrieved_chunks,
        selected_chunks: chunks.selected_chunks,
        final_prompt: String(data.final_prompt),
        token_usage: data.token_usage as QueryResponse["token_usage"],
        latency_ms: Object.values(latency).reduce((sum, ms) => sum + ms, 0),
        latency,
        pipeline,
        debugging: {}
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
  }, [queryId]);

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
