"use client";

import { Bot, Clock, Hash } from "lucide-react";
import type { QueryResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { formatMs } from "@/lib/utils";

export function AnswerDisplay({ result }: { result: QueryResponse | null }) {
  if (!result) {
    return (
      <Panel className="min-h-80">
        <PanelHeader>
          <PanelTitle>Answer</PanelTitle>
        </PanelHeader>
      </Panel>
    );
  }

  return (
    <Panel className="min-h-80">
      <PanelHeader>
        <PanelTitle className="inline-flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Answer
        </PanelTitle>
        <div className="flex flex-wrap gap-2">
          <Badge tone="muted">
            <Clock className="mr-1 h-3 w-3" />
            {formatMs(result.latency_ms)}
          </Badge>
          <Badge tone="accent">
            <Hash className="mr-1 h-3 w-3" />
            {result.query_id.slice(0, 8)}
          </Badge>
        </div>
      </PanelHeader>
      <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-7">{result.answer}</div>
      <div className="metric-grid mt-4">
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Input tokens</div>
          <div className="font-semibold">{result.token_usage.input_tokens}</div>
        </div>
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Output tokens</div>
          <div className="font-semibold">{result.token_usage.output_tokens}</div>
        </div>
        <div className="rounded-md border border-border bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground">Context tokens</div>
          <div className="font-semibold">{result.token_usage.context_tokens}</div>
        </div>
      </div>
    </Panel>
  );
}

