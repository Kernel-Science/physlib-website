"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { GraphvizView } from "@/components/graphviz-view";
import type { ApiMapNode } from "@/lib/yaml";
import { buildApiMapIdMap } from "@/lib/api-map-tree";

const HIGHLIGHT_STROKE = "#2563eb";
const HIGHLIGHT_WIDTH = "3";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeDotString(str: string): string {
  return str.replace(/"/g, '\\"');
}

function buildDot(nodes: ApiMapNode[], idOf: Map<string, string>): string {
  const byPath = new Map(nodes.map((n) => [n.path, n]));
  // Parents referenced by path but with no API-map.yaml of their own get a
  // plain node using the first name they were introduced under.
  const phantomNames = new Map<string, string>();
  for (const node of nodes) {
    for (const parent of node.parents) {
      if (!byPath.has(parent.path) && !phantomNames.has(parent.path)) {
        phantomNames.set(parent.path, parent.name);
      }
    }
  }

  let dot = "digraph G {\n  rankdir=TB;\n  node [shape=box, style=filled];\n";

  for (const node of nodes) {
    let subLabel: string;
    let fillColor: string;
    if (node.requirementsTotal === 0) {
      subLabel = "No requirements defined yet";
      fillColor = "#EEEEEE";
    } else if (node.requirementsDone === node.requirementsTotal) {
      subLabel = "Complete";
      fillColor = "#CCFFCC";
    } else if (node.requirementsDone === 0) {
      subLabel = `Next step: build requirements (0/${node.requirementsTotal})`;
      fillColor = "#FFCCCC";
    } else {
      subLabel = `${node.requirementsDone}/${node.requirementsTotal} requirements done`;
      fillColor = "#FFE8A3";
    }

    const label = escapeHtml(node.title);
    const dotId = escapeDotString(node.path);
    const svgId = idOf.get(node.path)!;
    dot += `  "${dotId}" [id="${svgId}", label=<${label}<BR/><FONT POINT-SIZE="10">${subLabel}</FONT>>, fillcolor="${fillColor}", URL="${node.url}"];\n`;
  }

  for (const [nodePath, name] of phantomNames) {
    const dotId = escapeDotString(nodePath);
    dot += `  "${dotId}" [label=<${escapeHtml(name)}>, fillcolor="#FFFFFF"];\n`;
  }

  for (const node of nodes) {
    for (const parent of node.parents) {
      dot += `  "${escapeDotString(parent.path)}" -> "${escapeDotString(node.path)}";\n`;
    }
  }

  dot += "}";
  return dot;
}

export function APITrackerClient({ nodes }: { nodes: ApiMapNode[] }) {
  const idOf = useMemo(() => buildApiMapIdMap(nodes), [nodes]);
  const getDot = useCallback(
    () => Promise.resolve(buildDot(nodes, idOf)),
    [nodes, idOf],
  );

  const highlightedRef = useRef<SVGGraphicsElement | null>(null);

  // The sidebar (ApiTrackerSidebar) is mounted outside this component's tree
  // - see the design-language skill - so selection is coordinated through
  // the URL hash rather than shared React state.
  useEffect(() => {
    function highlight(svgId: string): boolean {
      const shape = document
        .getElementById(svgId)
        ?.querySelector<SVGGraphicsElement>("polygon");
      if (!shape) return false;
      if (highlightedRef.current) {
        highlightedRef.current.style.stroke = "";
        highlightedRef.current.style.strokeWidth = "";
      }
      shape.style.stroke = HIGHLIGHT_STROKE;
      shape.style.strokeWidth = HIGHLIGHT_WIDTH;
      highlightedRef.current = shape;
      return true;
    }

    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function applyFromHash() {
      const nodePath = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      const svgId = nodePath ? idOf.get(nodePath) : undefined;
      if (!svgId) return;
      if (highlight(svgId)) return;
      // The graph renders asynchronously (Graphviz WASM), so the target node
      // may not exist yet - wait for it rather than polling on a guess.
      observer?.disconnect();
      observer = new MutationObserver(() => {
        if (highlight(svgId)) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      timeoutId = setTimeout(() => observer?.disconnect(), 10_000);
    }

    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);
    return () => {
      window.removeEventListener("hashchange", applyFromHash);
      observer?.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [idOf]);

  return <GraphvizView getDot={getDot} />;
}
