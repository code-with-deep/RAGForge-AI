"use client";

import { QueryPanel } from "@/components/QueryPanel";
import { AnswerDisplay } from "@/components/AnswerDisplay";
import { ChunkInspector } from "@/components/ChunkInspector";
import { useAppStore } from "@/store/useAppStore";

export default function DashboardPage() {
  const result = useAppStore((s) => s.latestQuery);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Query Interface</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ask questions using any retrieval strategy</p>
      </div>
      <QueryPanel />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <AnswerDisplay result={result} />
        <ChunkInspector chunks={result?.selected_chunks ?? []} />
      </div>
    </div>
  );
}
