"use client";

import { Code2, Timer } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { PipelineStep, QueryResponse } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { formatMs } from "@/lib/utils";

function StepDetails({ step }: { step: PipelineStep }) {
  return (
    <SyntaxHighlighter
      language="json"
      style={oneLight}
      customStyle={{ margin: 0, borderRadius: 6, fontSize: 12 }}
      wrapLongLines
    >
      {JSON.stringify(step.details, null, 2)}
    </SyntaxHighlighter>
  );
}

export function PipelineVisualizer({ result }: { result: QueryResponse | null }) {
  if (!result) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>Pipeline</PanelTitle>
        </PanelHeader>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Pipeline</PanelTitle>
        <Badge tone="muted">{result.strategy}</Badge>
      </PanelHeader>
      <div className="grid gap-3 lg:grid-cols-5">
        {result.pipeline.map((step, index) => (
          <details key={step.name} className="rounded-md border border-border bg-background p-3" open={index === 0}>
            <summary className="cursor-pointer">
              <div className="inline-flex items-center gap-2">
                <Badge tone={step.status === "completed" ? "good" : "bad"}>{index + 1}</Badge>
                <span className="text-sm font-semibold">{step.name.replaceAll("_", " ")}</span>
              </div>
            </summary>
            <div className="mt-3 space-y-2">
              <Badge tone="muted">
                <Timer className="mr-1 h-3 w-3" />
                {formatMs(step.latency_ms)}
              </Badge>
              <StepDetails step={step} />
            </div>
          </details>
        ))}
      </div>
      <details className="mt-4 rounded-md border border-border bg-background p-3">
        <summary className="cursor-pointer text-sm font-semibold">
          <Code2 className="mr-2 inline h-4 w-4" />
          Final prompt
        </summary>
        <div className="mt-3">
          <SyntaxHighlighter
            language="markdown"
            style={oneLight}
            customStyle={{ margin: 0, borderRadius: 6, fontSize: 12 }}
            wrapLongLines
          >
            {result.final_prompt}
          </SyntaxHighlighter>
        </div>
      </details>
    </Panel>
  );
}

