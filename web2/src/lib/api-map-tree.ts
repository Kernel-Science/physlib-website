import type { ApiMapNode } from "@/lib/yaml";

/**
 * One entry in the API tree. `node` is null for a "phantom" entry - a path
 * named in some API's ParentAPIs that has no API-map.yaml of its own. Those
 * still get a path/title and are still navigable (sidebar link, flowchart
 * box), just with no requirements/progress data behind them.
 */
export type ApiMapTreeEntry = {
  path: string;
  title: string;
  node: ApiMapNode | null;
  /** The parent this entry is nested under here - null for a top-level entry.
   *  A real node can have other (non-primary) parents too; see `node.parents`
   *  for those. */
  primaryParentPath: string | null;
  children: ApiMapTreeEntry[];
};

type PrimaryParent = { path: string; name: string };

/**
 * Depth-first flattening of the forest, which is exactly the top-to-bottom
 * order the sidebar renders - so "previous/next" steps through APIs in the
 * order the reader sees them listed rather than some unrelated sequence.
 */
export function flattenApiMapForest(forest: ApiMapTreeEntry[]): ApiMapTreeEntry[] {
  const out: ApiMapTreeEntry[] = [];
  const walk = (entries: ApiMapTreeEntry[]) => {
    for (const entry of entries) {
      out.push(entry);
      walk(entry.children);
    }
  };
  walk(forest);
  return out;
}

/**
 * Each real node's first parent - preferring one that also has its own
 * API-map.yaml, but falling back to the first phantom parent when it has no
 * real one. ParentAPIs is a DAG, not a tree; picking one edge per node is
 * what makes a tree renderable at all.
 */
function buildPrimaryParentMap(nodes: ApiMapNode[]): Map<string, PrimaryParent> {
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const map = new Map<string, PrimaryParent>();
  for (const node of nodes) {
    const realParent = node.parents.find((p) => byPath.has(p.path));
    const parent = realParent ?? node.parents[0];
    if (parent) map.set(node.path, parent);
  }
  return map;
}

/**
 * Nests every real API under its primary parent (see above), and gives every
 * phantom parent its own top-level entry so it's still visible and clickable
 * even though it has no API-map.yaml behind it.
 */
export function buildApiMapForest(nodes: ApiMapNode[]): ApiMapTreeEntry[] {
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  const primaryParentOf = buildPrimaryParentMap(nodes);

  const childrenOf = new Map<string, ApiMapNode[]>();
  for (const node of nodes) {
    const parent = primaryParentOf.get(node.path);
    if (parent) {
      const siblings = childrenOf.get(parent.path) ?? [];
      siblings.push(node);
      childrenOf.set(parent.path, siblings);
    }
  }

  // ParentAPIs can contain a cycle among *real* nodes (e.g. two APIs each
  // listing the other as a parent - Space and Time do). Each real node's
  // primary-parent pointer forms a functional graph (out-degree <= 1), so
  // every chain either terminates (at a true root or a phantom) or loops
  // back on itself; find each loop's single entry point so *it* - not an
  // arbitrary node inside or hanging off the loop - becomes the top-level
  // entry the rest nests under. Without this, a node stuck in a cycle has no
  // root to hang off of and silently disappears from the tree.
  const walkState = new Map<string, "visiting" | "done">();
  const cycleEntries = new Set<string>();
  function findCycleEntries(path: string): void {
    if (walkState.has(path)) return;
    walkState.set(path, "visiting");
    const parent = primaryParentOf.get(path);
    if (parent && byPath.has(parent.path)) {
      if (walkState.get(parent.path) === "visiting") cycleEntries.add(parent.path);
      else findCycleEntries(parent.path);
    }
    walkState.set(path, "done");
  }
  for (const node of nodes) findCycleEntries(node.path);

  const byTitle = (a: { title: string }, b: { title: string }) =>
    a.title.localeCompare(b.title);
  // Global backstop so a node is never rendered under more than one
  // top-level entry; `pathVisited` below only guards a single branch against
  // re-entering its own ancestors (the cycle itself).
  const placed = new Set<string>();

  // `parentPath` is the parent this entry is actually drawn under, which is
  // null for a top-level entry - notably including a node rooted because it
  // sits at a cycle's entry point. Reporting its would-be parent here instead
  // would let the UI hide that dependency (it filters the drawn parent out of
  // the "also needs" list), silently erasing the very edge that closes the
  // cycle.
  function toEntry(
    path: string,
    title: string,
    node: ApiMapNode | null,
    parentPath: string | null,
    pathVisited: Set<string>,
  ): ApiMapTreeEntry {
    placed.add(path);
    const children = (childrenOf.get(path) ?? [])
      .filter((c) => !pathVisited.has(c.path) && !placed.has(c.path))
      .sort(byTitle)
      .map((c) => toEntry(c.path, c.title, c, path, new Set(pathVisited).add(c.path)));
    return { path, title, node, primaryParentPath: parentPath, children };
  }

  // A real node roots the forest itself when it has no parent at all, or
  // when it's the entry point of a cycle. Anything else - including a node
  // whose only parent is a phantom - gets placed as somebody's child below.
  const realRoots = nodes.filter((n) => {
    const parent = primaryParentOf.get(n.path);
    return !parent || cycleEntries.has(n.path);
  });

  // Every phantom path that's actually somebody's primary parent becomes its
  // own top-level entry, in first-referenced order.
  const phantomRoots: PrimaryParent[] = [];
  for (const node of nodes) {
    const parent = primaryParentOf.get(node.path);
    if (parent && !byPath.has(parent.path) && !phantomRoots.some((p) => p.path === parent.path)) {
      phantomRoots.push(parent);
    }
  }

  const forest = [
    ...realRoots.map((n) => toEntry(n.path, n.title, n, null, new Set([n.path]))),
    ...phantomRoots
      .filter((p) => !placed.has(p.path))
      .map((p) => toEntry(p.path, p.name, null, null, new Set([p.path]))),
  ];

  return forest.sort(byTitle);
}
