import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "good" | "warn" | "bad" | "muted" | "accent";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "border-primary/30 bg-primary/10 text-primary",
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  bad: "border-red-500/30 bg-red-500/10 text-red-400",
  muted: "border-border bg-muted text-muted-foreground",
  accent: "border-secondary/30 bg-secondary/10 text-secondary"
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
