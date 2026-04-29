"use client";

import type { ChunkScore } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { percent, scoreTone } from "@/lib/utils";

function Score({ label, value }: { label: string; value?: number | null }) {
  const tone = scoreTone(value);
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Badge tone={tone === "good" ? "good" : tone === "warn" ? "warn" : tone === "bad" ? "bad" : "muted"}>
        {typeof value === "number" ? value.toFixed(3) : "n/a"}
      </Badge>
    </span>
  );
}

export function ChunkInspector({ chunks, title = "Retrieved chunks" }: { chunks: ChunkScore[]; title?: string }) {
  return (
    <Panel className="h-full">
      <PanelHeader>
        <PanelTitle>{title}</PanelTitle>
        <Badge tone="muted">{chunks.length}</Badge>
      </PanelHeader>
      <div className="space-y-3">
        {chunks.map((chunk) => (
          <details key={`${chunk.id}-${chunk.rank}`} className="rounded-md border border-border bg-background p-3" open={chunk.rank <= 2}>
            <summary className="cursor-pointer">
              <div className="inline-flex flex-wrap items-center gap-2">
                <Badge>#{chunk.rank}</Badge>
                <span className="text-sm font-medium">{String(chunk.metadata.source ?? "unknown")}</span>
                <Badge tone="muted">{String(chunk.metadata.strategy ?? "chunk")}</Badge>
                {chunk.rerank_score !== null && chunk.rerank_score !== undefined ? (
                  <Badge tone={scoreTone(chunk.rerank_score) === "good" ? "good" : "warn"}>{percent(chunk.rerank_score)}</Badge>
                ) : null}
              </div>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-2">
                <Score label="Vector" value={chunk.vector_score} />
                <Score label="BM25" value={chunk.bm25_score} />
                <Score label="RRF" value={chunk.rrf_score} />
                <Score label="Re-rank" value={chunk.rerank_score} />
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
                <span>Original rank: {chunk.original_rank ?? "n/a"}</span>
                <span>New rank: {chunk.rerank_rank ?? chunk.rank}</span>
                <span>Page: {String(chunk.metadata.page_number ?? "n/a")}</span>
              </div>
              <p className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-sm leading-6">{chunk.text}</p>
            </div>
          </details>
        ))}
        {!chunks.length ? <p className="text-sm text-muted-foreground">No chunks returned.</p> : null}
      </div>
    </Panel>
  );
}

