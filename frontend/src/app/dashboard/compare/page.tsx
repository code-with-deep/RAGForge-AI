import { ComparisonView } from "@/components/ComparisonView";

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">A/B Comparison</h1>
        <p className="mt-1 text-sm text-muted-foreground">Compare two retrieval strategies side by side</p>
      </div>
      <ComparisonView />
    </div>
  );
}
