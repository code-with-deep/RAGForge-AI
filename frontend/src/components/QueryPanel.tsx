"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, SlidersHorizontal } from "lucide-react";
import { ask, listDocuments, listStrategies } from "@/lib/api";
import type { MetadataFilters as Filters, QueryRequest, RetrievalStrategy } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { MetadataFilters } from "@/components/MetadataFilters";
import { StrategySelector } from "@/components/StrategySelector";

const defaultFilters: Filters = {
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

export function QueryPanel() {
  const strategies = useAppStore((state) => state.strategies);
  const documents = useAppStore((state) => state.documents);
  const setStrategies = useAppStore((state) => state.setStrategies);
  const setDocuments = useAppStore((state) => state.setDocuments);
  const setLatestQuery = useAppStore((state) => state.setLatestQuery);

  const [query, setQuery] = useState("How does hybrid search improve exact-match retrieval for E-4021?");
  const [strategy, setStrategy] = useState<RetrievalStrategy>("hybrid_rerank");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [semanticWeight, setSemanticWeight] = useState(0.7);
  const [topKFinal, setTopKFinal] = useState(5);
  const [enableStepBack, setEnableStepBack] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listStrategies().then(setStrategies).catch(() => undefined);
    listDocuments().then(setDocuments).catch(() => undefined);
  }, [setDocuments, setStrategies]);

  const payload: QueryRequest = useMemo(
    () => ({
      query,
      strategy,
      filters,
      semantic_weight: semanticWeight,
      keyword_weight: Number((1 - semanticWeight).toFixed(2)),
      top_k_initial: 20,
      top_k_final: topKFinal,
      enable_step_back: enableStepBack
    }),
    [query, strategy, filters, semanticWeight, topKFinal, enableStepBack]
  );

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const result = await ask(payload);
      setLatestQuery(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Query Interface</PanelTitle>
        <Button onClick={submit} disabled={loading || query.trim().length < 2}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask
        </Button>
      </PanelHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-28" />
          <MetadataFilters value={filters} documents={documents} onChange={setFilters} />
          {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        </div>
        <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
          <div className="space-y-1">
            <Label>Strategy</Label>
            <StrategySelector value={strategy} onChange={setStrategy} strategies={strategies} />
          </div>
          <div className="space-y-1">
            <Label>Semantic weight {semanticWeight.toFixed(2)}</Label>
            <Input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={semanticWeight}
              onChange={(event) => setSemanticWeight(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label>Final chunks</Label>
            <Input type="number" min={1} max={20} value={topKFinal} onChange={(event) => setTopKFinal(Number(event.target.value))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enableStepBack} onChange={(event) => setEnableStepBack(event.target.checked)} />
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Step-back
          </label>
        </div>
      </div>
    </Panel>
  );
}

