import type { ApiMapNode } from "@/lib/yaml";

export type ApiMapTreeEntry = { node: ApiMapNode; children: ApiMapTreeEntry[] };

/** Stable per-node id used to link a sidebar entry to its rendered SVG node. */
export function buildApiMapIdMap(nodes: ApiMapNode[]): Map<string, string> {
  const map = new Map<string, string>();
  nodes.forEach((n, i) => map.set(n.path, `api-node-${i}`));
  return map;
}

/**
 * Nests nodes under their first parent that also has its own API-map.yaml
 * (ParentAPIs is a DAG, not a tree - picking the first real parent avoids a
 * node appearing under more than one branch). Nodes with no real parent, or
 * only phantom parents, become top-level entries.
 */
export function buildApiMapForest(nodes: ApiMapNode[]): ApiMapTreeEntry[] {
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const childrenOf = new Map<string, ApiMapNode[]>();
  const primaryParentOf = new Map<string, string>();

  for (const node of nodes) {
    const primaryParent = node.parents.find((p) => byPath.has(p.path));
    if (primaryParent) {
      primaryParentOf.set(node.path, primaryParent.path);
      const siblings = childrenOf.get(primaryParent.path) ?? [];
      siblings.push(node);
      childrenOf.set(primaryParent.path, siblings);
    }
  }

  // ParentAPIs can contain a cycle (e.g. two APIs each listing the other as
  // a parent - Space and Time do). Each node's primary-parent pointer forms
  // a functional graph (out-degree <= 1), so every chain either terminates
  // at a true root or loops back on itself; find each loop's single entry
  // point so *it* - not an arbitrary node inside or hanging off the loop -
  // becomes the top-level entry the rest nests under. Without this, a node
  // stuck in (or only reachable through) a cycle has no root to hang off of
  // and silently disappears from the sidebar.
  const walkState = new Map<string, "visiting" | "done">();
  const cycleEntries = new Set<string>();
  function findCycleEntries(path: string): void {
    if (walkState.has(path)) return;
    walkState.set(path, "visiting");
    const parent = primaryParentOf.get(path);
    if (parent !== undefined) {
      if (walkState.get(parent) === "visiting") cycleEntries.add(parent);
      else findCycleEntries(parent);
    }
    walkState.set(path, "done");
  }
  for (const node of nodes) findCycleEntries(node.path);

  const byTitle = (a: ApiMapNode, b: ApiMapNode) => a.title.localeCompare(b.title);
  // Global backstop so a node is never rendered under more than one
  // top-level entry; `pathVisited` below only guards a single branch against
  // re-entering its own ancestors (the cycle itself).
  const placed = new Set<string>();

  function toEntry(node: ApiMapNode, pathVisited: Set<string>): ApiMapTreeEntry {
    placed.add(node.path);
    const children = (childrenOf.get(node.path) ?? [])
      .filter((c) => !pathVisited.has(c.path) && !placed.has(c.path))
      .sort(byTitle)
      .map((c) => toEntry(c, new Set(pathVisited).add(c.path)));
    return { node, children };
  }

  const roots = nodes.filter(
    (n) => !primaryParentOf.has(n.path) || cycleEntries.has(n.path),
  );
  return roots.sort(byTitle).map((n) => toEntry(n, new Set([n.path])));
}
