"use client";

import { QueryPanel } from "@/components/QueryPanel";
import { AnswerDisplay } from "@/components/AnswerDisplay";
import { ChunkInspector } from "@/components/ChunkInspector";
import { useAppStore } from "@/store/useAppStore";
import { Search } from "lucide-react";

export default function DashboardPage() {
  const result = useAppStore((s) => s.latestQuery);

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-3">
        <div className="mt-1 hidden h-9 w-9 place-items-center rounded-lg border border-border bg-card text-primary sm:grid"><Search className="h-4 w-4" /></div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-primary">Your knowledge base</p>
          <h1 className="text-[26px] font-semibold tracking-[-.035em] text-foreground">Ask your documents</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Search across your sources and get answers grounded in the original material.</p>
        </div>
      </div>
      <QueryPanel />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <AnswerDisplay result={result} />
        <ChunkInspector chunks={result?.selected_chunks ?? []} />
      </div>
    </div>
  );
}
