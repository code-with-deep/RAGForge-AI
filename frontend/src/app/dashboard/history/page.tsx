"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, Search } from "lucide-react";
import { queryHistory } from "@/lib/api";
import type { QueryHistoryItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { formatMs } from "@/lib/utils";
import Link from "next/link";

export default function HistoryPage() {
  const [items, setItems] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    queryHistory(50)
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Query History</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review your past queries and their results</p>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>Recent Queries</PanelTitle>
          <Badge tone="muted">{items.length}</Badge>
        </PanelHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">No queries yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Run your first query from the dashboard to see it here.</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/pipeline?id=${item.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-background p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Search className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.original_query}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge tone="muted">{item.strategy}</Badge>
                    <Badge tone="muted">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatMs(item.latency_ms)}
                    </Badge>
                  </div>
                </div>
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  {new Date(item.created_at).toLocaleDateString()}
                  <br />
                  {new Date(item.created_at).toLocaleTimeString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
