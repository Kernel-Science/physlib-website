import type { ApiMapNode } from "@/lib/yaml";

/**
 * The API maps arranged by where they live in Physlib's folders - the left
 * menu of the API tracker, and the order its previous/next arrows step
 * through. (How the maps cite one another is the flowchart's job, see
 * api-map-tree.ts.)
 *
 * Only folders on the way to some map appear. A run of folders holding no
 * map and only one subfolder collapses to a single entry, e.g.
 * `Particles/BeyondTheStandardModel` rather than two nested levels.
 */
export type FolderEntry = {
  /** The folder's path, which for a map is also its id on the page. */
  path: string;
  /** The map's title, or the folder name(s) for a folder without a map. */
  label: string;
  node: ApiMapNode | null;
  children: FolderEntry[];
};

type Trie = { path: string; segment: string; node: ApiMapNode | null; children: Map<string, Trie> };

function toEntry(t: Trie, labelPrefix = ""): FolderEntry {
  // Collapse a map-less folder whose only content is one map-less subfolder.
  if (!t.node && t.children.size === 1) {
    const [only] = t.children.values();
    if (!only.node) return toEntry(only, `${labelPrefix}${t.segment}/`);
  }
  const children = [...t.children.values()]
    .sort((a, b) => a.segment.localeCompare(b.segment))
    .map((c) => toEntry(c));
  return {
    path: t.path,
    label: t.node ? t.node.title : `${labelPrefix}${t.segment}`,
    node: t.node,
    children,
  };
}

/** One entry per library root (`Physlib`, `QuantumInfo`, …) holding a map. */
export function buildFolderTree(nodes: ApiMapNode[]): FolderEntry[] {
  const roots = new Map<string, Trie>();
  for (const node of nodes) {
    const segments = node.path.split("/");
    let level = roots;
    let current: Trie | null = null;
    segments.forEach((segment, i) => {
      let next = level.get(segment);
      if (!next) {
        next = { path: segments.slice(0, i + 1).join("/"), segment, node: null, children: new Map() };
        level.set(segment, next);
      }
      current = next;
      level = next.children;
    });
    if (current) (current as Trie).node = node;
  }
  return [...roots.values()]
    .sort((a, b) => a.segment.localeCompare(b.segment))
    .map((root) => ({
      path: root.path,
      label: root.segment,
      node: root.node,
      children: [...root.children.values()]
        .sort((a, b) => a.segment.localeCompare(b.segment))
        .map((c) => toEntry(c)),
    }));
}

/** The maps in menu order, top to bottom. */
export function flattenFolderTree(tree: FolderEntry[]): ApiMapNode[] {
  const out: ApiMapNode[] = [];
  const walk = (entries: FolderEntry[]) => {
    for (const e of entries) {
      if (e.node) out.push(e.node);
      walk(e.children);
    }
  };
  walk(tree);
  return out;
}
