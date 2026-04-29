"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { getPipeline } from "@/lib/api";
import type { QueryResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { PipelineVisualizer } from "@/components/PipelineVisualizer";
import { useAppStore } from "@/store/useAppStore";

export default function PipelinePage() {
  const latest = useAppStore((state) => state.latestQuery);
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id") ?? "";
  const [queryId, setQueryId] = useState(urlId || (latest?.query_id ?? ""));
  const [remote, setRemote] = useState<QueryResponse | null>(null);
  const result = remote ?? latest;

  const load = useCallback(async (id?: string) => {
    const target = id ?? queryId;
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
          <Button onClick={() => load()} disabled={!queryId} size="sm">
            <Search className="h-4 w-4" />
            Load
          </Button>
        </PanelHeader>
        <Input value={queryId} onChange={(e) => setQueryId(e.target.value)} placeholder="Paste a query ID..." />
      </Panel>
      <PipelineVisualizer result={result} />
    </div>
  );
}
