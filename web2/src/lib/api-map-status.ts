import type { ApiMapNode } from "@/lib/yaml";

/**
 * How far along an API is, derived from its API-map.yaml requirements.
 * Shared so the flowchart boxes and the sidebar dots classify identically -
 * two copies of these thresholds would eventually disagree.
 */
export type ApiStatusKind = "none" | "unstarted" | "partial" | "complete";

export function apiStatusKind(node: ApiMapNode): ApiStatusKind {
  const total = node.requirements.length;
  if (total === 0) return "none";
  const done = node.requirements.filter((r) => r.done).length;
  if (done === total) return "complete";
  if (done === 0) return "unstarted";
  return "partial";
}

/** Fill for a small status dot. Solid rather than the box's translucent tint,
 *  which is too faint to read at a few pixels across. */
export const API_STATUS_DOT: Record<ApiStatusKind, string> = {
  none: "bg-muted/40",
  unstarted: "bg-danger",
  partial: "bg-warning",
  complete: "bg-success",
};
