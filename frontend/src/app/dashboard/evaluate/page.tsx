import { EvalDashboard } from "@/components/EvalDashboard";

export default function EvaluatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Evaluation Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Benchmark all strategies with measurable metrics</p>
      </div>
      <EvalDashboard />
    </div>
  );
}
