import type { AtlasNode } from "@/lib/yaml";

/**
 * How far along an API is, derived from the claims of its Atlas.md - runs of [n] citations, done unless one is [TODO].
 * Shared so the flowchart boxes and the sidebar dots classify identically -
 * two copies of these thresholds would eventually disagree.
 */
export type AtlasStatusKind = "none" | "unstarted" | "partial" | "complete";

export function atlasStatusKind(node: AtlasNode): AtlasStatusKind {
  const total = node.requirements.length;
  if (total === 0) return "none";
  const done = node.requirements.filter((r) => r.done).length;
  if (done === total) return "complete";
  if (done === 0) return "unstarted";
  return "partial";
}

/** Solid fill for small status indicators - a sidebar dot, a progress bar.
 *  Solid rather than the box's translucent tint, which is too faint to read
 *  at a few pixels across. */
export const ATLAS_STATUS_DOT: Record<AtlasStatusKind, string> = {
  none: "bg-muted/40",
  unstarted: "bg-danger",
  partial: "bg-warning",
  complete: "bg-success",
};

export const ATLAS_STATUS_LABEL: Record<AtlasStatusKind, string> = {
  none: "No claims yet",
  unstarted: "Not started",
  partial: "In progress",
  complete: "Complete",
};
