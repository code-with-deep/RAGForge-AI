import { Badge } from "@/components/ui/badge";
import { percent, scoreTone } from "@/lib/utils";

export function MetricPill({ label, score }: { label: string; score?: number | null }) {
  const tone = scoreTone(score);
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge tone={tone === "good" ? "good" : tone === "warn" ? "warn" : tone === "bad" ? "bad" : "muted"}>{percent(score)}</Badge>
    </div>
  );
}

