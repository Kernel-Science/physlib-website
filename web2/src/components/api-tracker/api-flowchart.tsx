"use client";

import { useEffect, useState } from "react";
import type { ApiMapNode } from "@/lib/yaml";
import { buildApiMapForest, type ApiMapTreeEntry } from "@/lib/api-map-tree";
import { selectApiMapEntry } from "@/lib/api-map-hash";

function statusStyle(node: ApiMapNode): { box: string; label: string } {
  if (node.requirementsTotal === 0) {
    return { box: "bg-surface-secondary border-border", label: "No requirements yet" };
  }
  if (node.requirementsDone === node.requirementsTotal) {
    return { box: "bg-success/15 border-success/40", label: "Complete" };
  }
  if (node.requirementsDone === 0) {
    return {
      box: "bg-danger/10 border-danger/30",
      label: `0/${node.requirementsTotal} requirements done`,
    };
  }
  return {
    box: "bg-warning/15 border-warning/40",
    label: `${node.requirementsDone}/${node.requirementsTotal} requirements done`,
  };
}

function FlowNode({
  entry,
  activePath,
}: {
  entry: ApiMapTreeEntry;
  activePath: string;
}) {
  const { path, title, node, children, primaryParentPath } = entry;
  const isActive = path === activePath;

  // Only one parent becomes this box's connector line (see api-map-tree.ts);
  // any others are still real dependencies, so surface them as text instead
  // of silently dropping them.
  const otherParents = node ? node.parents.filter((p) => p.path !== primaryParentPath) : [];

  const style = node
    ? statusStyle(node)
    : { box: "border-dashed border-border bg-surface-secondary/60", label: "No API-map.yaml yet" };

  return (
    <li>
      <a
        id={path}
        href={`#${path}`}
        onClick={(e) => {
          e.preventDefault();
          selectApiMapEntry(path);
        }}
        title={node ? title : `${title} (no API-map.yaml yet)`}
        className={`flex w-44 flex-col gap-0.5 rounded-lg border px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md ${style.box} ${
          isActive ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
        }`}
      >
        <span
          className={`truncate text-sm font-medium ${node ? "text-foreground" : "text-muted italic"}`}
        >
          {title}
        </span>
        <span className="truncate text-[11px] text-muted">{style.label}</span>
        {otherParents.length > 0 && (
          <span className="line-clamp-2 text-[10px] leading-snug text-muted/70">
            Also needs: {otherParents.map((p) => p.name).join(", ")}
          </span>
        )}
      </a>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <FlowNode key={child.path} entry={child} activePath={activePath} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ApiFlowchart({ nodes }: { nodes: ApiMapNode[] }) {
  const [activePath, setActivePath] = useState("");

  useEffect(() => {
    const onHashChange = () => {
      const path = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      setActivePath(path);
      // "nearest" on both axes: scrolls the horizontally-scrolling flowchart
      // container as needed to reveal the box left-to-right, but leaves the
      // page's own vertical scroll alone whenever the box is already
      // vertically visible instead of forcing it to the top (the browser's
      // native hash-jump behavior, which selectApiMapEntry deliberately
      // bypasses).
      if (path) {
        document
          .getElementById(path)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const forest = buildApiMapForest(nodes);

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <ul className="api-tree">
        {forest.map((entry) => (
          <FlowNode key={entry.path} entry={entry} activePath={activePath} />
        ))}
      </ul>
    </div>
  );
}
