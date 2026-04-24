"use client";

import { useEffect, useState } from "react";
import ReactDiffViewer from "react-diff-viewer-continued";
import { GitCompare, Loader2 } from "lucide-react";
import { compare, listStrategies } from "@/lib/api";
import type { CompareResponse, MetadataFilters, RetrievalStrategy } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { StrategySelector } from "@/components/StrategySelector";
import { ChunkInspector } from "@/components/ChunkInspector";
import { useAppStore } from "@/store/useAppStore";

const filters: MetadataFilters = {
  sources: [],
  page_start: null,
  page_end: null,
  sections: [],
  tags: [],
  chunk_strategies: [],
  date_start: null,
  date_end: null,
  logic: "and"
};

export function ComparisonView() {
  const strategies = useAppStore((state) => state.strategies);
  const setStrategies = useAppStore((state) => state.setStrategies);
  const [query, setQuery] = useState("Compare recursive chunking and parent-child chunking.");
  const [strategyA, setStrategyA] = useState<RetrievalStrategy>("hybrid");
  const [strategyB, setStrategyB] = useState<RetrievalStrategy>("hybrid_rerank");
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStrategies().then(setStrategies).catch(() => undefined);
  }, [setStrategies]);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        query,
        strategy: strategyA,
        filters,
        semantic_weight: 0.7,
        keyword_weight: 0.3,
        top_k_initial: 20,
        top_k_final: 5,
        enable_step_back: false
      };
      setResult(await compare(query, strategyA, strategyB, payload));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader>
          <PanelTitle>A/B Comparison</PanelTitle>
          <Button onClick={submit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            Compare
          </Button>
        </PanelHeader>
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} />
          <StrategySelector value={strategyA} onChange={setStrategyA} strategies={strategies} />
          <StrategySelector value={strategyB} onChange={setStrategyB} strategies={strategies} />
        </div>
        {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </Panel>
      {result ? (
        <>
          <Panel>
            <PanelHeader>
              <PanelTitle>Answers</PanelTitle>
              <Badge tone="accent">overlap {String(result.metrics.overlap_ratio ?? "0")}</Badge>
            </PanelHeader>
            <ReactDiffViewer
              oldValue={result.result_a.answer}
              newValue={result.result_b.answer}
              splitView
              leftTitle={strategyA}
              rightTitle={strategyB}
            />
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChunkInspector title={strategyA} chunks={result.result_a.selected_chunks} />
            <ChunkInspector title={strategyB} chunks={result.result_b.selected_chunks} />
          </div>
        </>
      ) : null}
    </div>
  );
}

