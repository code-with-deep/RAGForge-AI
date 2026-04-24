"use client";

import { useState } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { evaluateBatch } from "@/lib/api";
import type { BatchEvaluationResponse, RetrievalStrategy } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { MetricPill } from "@/components/MetricPill";

const allStrategies: RetrievalStrategy[] = [
  "basic_vector",
  "hybrid",
  "hybrid_rerank",
  "parent_child",
  "multi_query",
  "hyde",
  "decomposition"
];

export function EvalDashboard() {
  const cached = useAppStore((state) => state.evaluation);
  const setEvaluation = useAppStore((state) => state.setEvaluation);
  const [result, setResult] = useState<BatchEvaluationResponse | null>(cached);
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const response = await evaluateBatch(allStrategies, limit);
      setResult(response);
      setEvaluation(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }

  const chartData = result?.leaderboard ?? [];

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader>
          <PanelTitle>Evaluation Dashboard</PanelTitle>
          <div className="flex items-center gap-2">
            <Select value={String(limit)} onChange={(event) => setLimit(Number(event.target.value))} className="w-28">
              <option value="3">3 Qs</option>
              <option value="5">5 Qs</option>
              <option value="10">10 Qs</option>
              <option value="20">20 Qs</option>
            </Select>
            <Button onClick={run} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Run
            </Button>
          </div>
        </PanelHeader>
        {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </Panel>
      {result ? (
        <>
          <Panel>
            <PanelHeader>
              <PanelTitle>Strategy Leaderboard</PanelTitle>
              <Badge tone="muted">{result.results.length} runs</Badge>
            </PanelHeader>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                  <YAxis domain={[0, 1]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="faithfulness" fill="#059669" />
                  <Bar dataKey="answer_relevancy" fill="#7c3aed" />
                  <Bar dataKey="context_precision" fill="#d97706" />
                  <Bar dataKey="context_recall" fill="#0d9488" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <div className="grid gap-4 lg:grid-cols-2">
            {result.leaderboard.map((row) => (
              <Panel key={String(row.strategy)}>
                <PanelHeader>
                  <PanelTitle>{String(row.strategy)}</PanelTitle>
                  <Badge tone="accent">{Number(row.aggregate).toFixed(3)}</Badge>
                </PanelHeader>
                <div className="metric-grid">
                  <MetricPill label="Faithfulness" score={Number(row.faithfulness)} />
                  <MetricPill label="Relevancy" score={Number(row.answer_relevancy)} />
                  <MetricPill label="Precision" score={Number(row.context_precision)} />
                  <MetricPill label="Recall" score={Number(row.context_recall)} />
                </div>
              </Panel>
            ))}
          </div>
          <Panel>
            <PanelHeader>
              <PanelTitle>Failure Analysis</PanelTitle>
            </PanelHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                    <th className="py-2">Strategy</th>
                    <th>Question</th>
                    <th>Aggregate</th>
                    <th>Status</th>
                    <th>Signals</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results
                    .filter((item) => !item.passed)
                    .slice(0, 25)
                    .map((item) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="py-2">{item.strategy}</td>
                        <td>{item.question}</td>
                        <td>{item.scores.aggregate.toFixed(3)}</td>
                        <td>
                          <Badge tone="bad">fail</Badge>
                        </td>
                        <td>{item.failure_analysis.join(" ")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

