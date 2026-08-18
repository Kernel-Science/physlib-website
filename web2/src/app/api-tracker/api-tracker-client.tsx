"use client";

import { useCallback } from "react";
import { GraphvizView } from "@/components/graphviz-view";
import type { ApiMapNode } from "@/lib/yaml";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeDotId(str: string): string {
  return str.replace(/"/g, '\\"');
}

function buildDot(nodes: ApiMapNode[]): string {
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
    const id = escapeDotId(node.path);
    dot += `  "${id}" [label=<${label}<BR/><FONT POINT-SIZE="10">${subLabel}</FONT>>, fillcolor="${fillColor}", URL="${node.url}"];\n`;
  }

  for (const [nodePath, name] of phantomNames) {
    const id = escapeDotId(nodePath);
    dot += `  "${id}" [label=<${escapeHtml(name)}>, fillcolor="#FFFFFF"];\n`;
  }

  for (const node of nodes) {
    for (const parent of node.parents) {
      dot += `  "${escapeDotId(parent.path)}" -> "${escapeDotId(node.path)}";\n`;
    }
  }

  dot += "}";
  return dot;
}

export function APITrackerClient({ nodes }: { nodes: ApiMapNode[] }) {
  const getDot = useCallback(() => Promise.resolve(buildDot(nodes)), [nodes]);
  return <GraphvizView getDot={getDot} />;
}
