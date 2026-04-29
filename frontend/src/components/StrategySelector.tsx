"use client";

import type { RetrievalStrategy, StrategyInfo } from "@/lib/types";
import { Select } from "@/components/ui/select";

const fallback: StrategyInfo[] = [
  { key: "basic_vector", label: "Basic Vector", description: "", uses_transformation: false, uses_hybrid: false, uses_rerank: false },
  { key: "hybrid", label: "Hybrid", description: "", uses_transformation: false, uses_hybrid: true, uses_rerank: false },
  { key: "hybrid_rerank", label: "Hybrid + Re-Rank", description: "", uses_transformation: false, uses_hybrid: true, uses_rerank: true },
  { key: "parent_child", label: "Parent-Child", description: "", uses_transformation: false, uses_hybrid: true, uses_rerank: true },
  { key: "multi_query", label: "Multi-Query", description: "", uses_transformation: true, uses_hybrid: true, uses_rerank: true },
  { key: "hyde", label: "HyDE", description: "", uses_transformation: true, uses_hybrid: true, uses_rerank: true },
  { key: "decomposition", label: "Query Decomposition", description: "", uses_transformation: true, uses_hybrid: true, uses_rerank: true }
];

export function StrategySelector({
  value,
  onChange,
  strategies
}: {
  value: RetrievalStrategy;
  onChange: (strategy: RetrievalStrategy) => void;
  strategies?: StrategyInfo[];
}) {
  const options = strategies?.length ? strategies : fallback;
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as RetrievalStrategy)}>
      {options.map((strategy) => (
        <option key={strategy.key} value={strategy.key}>
          {strategy.label}
        </option>
      ))}
    </Select>
  );
}

