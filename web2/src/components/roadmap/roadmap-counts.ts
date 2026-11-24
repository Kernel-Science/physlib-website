import { SOURCES, type Entry, type Source } from "./layout";

export type RoadmapCounts = Record<Source, number>;

function emptyCounts(): RoadmapCounts {
  return { Physlib: 0, PhyslibAlpha: 0, External: 0, UnformalizedClaims: 0 };
}

export function roadmapCounts(roots: Entry[]) {
  const byEntry = new Map<Entry, RoadmapCounts>();
  const whole = emptyCounts();

  function visit(entry: Entry, parent: RoadmapCounts) {
    const counts = emptyCounts();
    const group = entry.node.externalGroup;
    if (group) {
      // External entries carry a few preview declarations and the full count
      // assigned to this topic. Only the latter contributes to the totals.
      counts.External = group.count;
    } else {
      for (const declaration of entry.decls) counts[declaration.source]++;
    }
    for (const child of entry.children) visit(child, counts);
    byEntry.set(entry, counts);
    for (const source of SOURCES) parent[source] += counts[source];
  }

  for (const root of roots) visit(root, whole);
  return { whole, byEntry };
}
