import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMs(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "0 ms";
  if (value > 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${value.toFixed(0)} ms`;
}

export function scoreTone(score?: number | null) {
  if (score === undefined || score === null) return "muted";
  if (score >= 0.75) return "good";
  if (score >= 0.45) return "warn";
  return "bad";
}

export function percent(score?: number | null) {
  if (score === undefined || score === null) return "n/a";
  return `${Math.round(score * 100)}%`;
}

