import { formatDistanceToNowStrict, parseISO } from "date-fns";

export function formatPlatinum(value: number | null): string {
  return value === null ? "N/A" : `${value.toLocaleString()} pt`;
}

export function formatPercent(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "Unknown";
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}

export function formatRelative(value: string | null): string {
  if (!value) return "Unknown";
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${formatDistanceToNowStrict(date)} ago`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
