"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GraphvizView } from "@/components/graphviz-view";

function bfs(startNodes: string[], graph: Record<string, Set<string>>): Set<string> {
  const visited = new Set(startNodes);
  const queue = [...startNodes];
  while (queue.length) {
    const node = queue.shift()!;
    for (const next of graph[node] ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

async function filterDot(
  dotText: string,
  sources: string[],
  targets: string[],
): Promise<string> {
  const edgeRegex = /"([^"]+)"\s*->\s*"([^"]+)"/g;
  const adj: Record<string, Set<string>> = {};
  const revAdj: Record<string, Set<string>> = {};
  let m: RegExpExecArray | null;

  while ((m = edgeRegex.exec(dotText)) !== null) {
    const [, from, to] = m;
    (adj[from] ??= new Set()).add(to);
    (revAdj[to] ??= new Set()).add(from);
  }

  const backward = bfs(targets, revAdj);
  let keep: Set<string>;
  if (sources.length === 0) {
    keep = backward;
  } else {
    const forward = bfs(sources, adj);
    keep = new Set([...forward].filter((n) => backward.has(n)));
  }

  // Match node lines: "Name" [...] on a single line (dot format outputs one node per line)
  const nodeRegex = /"([^"]+)"\s*\[[^\]]*\]/g;
  let result = 'digraph "import_graph" {\n';

  while ((m = nodeRegex.exec(dotText)) !== null) {
    if (keep.has(m[1])) result += `  ${m[0]}\n`;
  }

  edgeRegex.lastIndex = 0;
  while ((m = edgeRegex.exec(dotText)) !== null) {
    const [, from, to] = m;
    if (keep.has(from) && keep.has(to))
      result += `  "${from}" -> "${to}";\n`;
  }

  return result + "}";
}

function parseUrlParam(param: string | null, fallback: string[]): string[] {
  if (param === null) return fallback;
  if (param === "") return [];
  return param.split(",");
}

export function DependenciesClient() {
  const dotTextRef = useRef<string | null>(null);
  const [nodes, setNodes] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [renderKey, setRenderKey] = useState(0);
  const [dotReady, setDotReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const srcParam = params.get("sources");
    const tgtParam = params.get("targets");

    fetch("/my_graph.dot")
      .then((r) => r.text())
      .then((text) => {
        dotTextRef.current = text;

        const nodeRegex = /"([^"]+)"\s*\[/g;
        const found = new Set<string>();
        let m: RegExpExecArray | null;
        while ((m = nodeRegex.exec(text)) !== null) found.add(m[1]);
        const sorted = Array.from(found).sort();
        setNodes(sorted);

        const defaultSrc = ["Physlib.ClassicalMechanics.HamiltonsEquations"];
        const defaultTgt = ["Physlib"];
        setSources(parseUrlParam(srcParam, defaultSrc));
        setTargets(parseUrlParam(tgtParam, defaultTgt));
        setDotReady(true);
      })
      .catch(console.error);
  }, []);

  const getDot = useCallback(async () => {
    if (!dotTextRef.current) throw new Error("dot not loaded");
    return filterDot(dotTextRef.current, sources, targets);
  }, [sources, targets, renderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSource(node: string) {
    setSources((prev) =>
      prev.includes(node) ? prev.filter((n) => n !== node) : [...prev, node],
    );
  }

  function toggleTarget(node: string) {
    setTargets((prev) =>
      prev.includes(node) ? prev.filter((n) => n !== node) : [...prev, node],
    );
  }

  function handleRender() {
    setRenderKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      {dotReady && (
        <GraphvizView key={renderKey} getDot={getDot} height="500px" />
      )}

      <h2 className="text-lg font-semibold">Custom Graph</h2>
      <p className="text-sm text-muted -mt-4">
        Select sources and targets, then click Render.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <CheckboxList
          title="Sources"
          nodes={nodes}
          selected={sources}
          onToggle={toggleSource}
          prefix="src"
        />
        <CheckboxList
          title="Targets"
          nodes={nodes}
          selected={targets}
          onToggle={toggleTarget}
          prefix="tgt"
        />
      </div>

      <button
        onClick={handleRender}
        className="w-full rounded-lg bg-accent text-white py-3 font-medium hover:bg-accent/90 transition-colors"
      >
        Render Graph
      </button>
    </div>
  );
}

function CheckboxList({
  title,
  nodes,
  selected,
  onToggle,
  prefix,
}: {
  title: string;
  nodes: string[];
  selected: string[];
  onToggle: (n: string) => void;
  prefix: string;
}) {
  return (
    <div>
      <h3 className="font-medium mb-2">{title}</h3>
      <div className="h-48 overflow-y-auto rounded-lg border border-border bg-surface p-2 font-mono text-xs space-y-1">
        {nodes.map((node) => (
          <label
            key={node}
            className="flex items-center gap-2 cursor-pointer hover:text-accent"
          >
            <input
              type="checkbox"
              id={`${prefix}-${node}`}
              checked={selected.includes(node)}
              onChange={() => onToggle(node)}
              className="accent-accent"
            />
            {node}
          </label>
        ))}
      </div>
    </div>
  );
}
