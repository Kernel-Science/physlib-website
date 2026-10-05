"use client";

import { useCallback } from "react";
import { GraphvizView } from "@/components/graphviz-view";

async function buildDot(): Promise<string> {
  const [dotRes, undocRes] = await Promise.all([
    fetch("/my_graph.dot"),
    fetch(
      "https://raw.githubusercontent.com/leanprover-community/physlib/master/scripts/lint/exemptions/module_doc_no_lint.txt",
    ),
  ]);

  let dotText = await dotRes.text();
  const undocText = await undocRes.text();

  const undocumented = new Set(
    undocText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((p) => p.replace(/\//g, ".").replace(".lean", "")),
  );

  dotText = dotText.replace(
    /"([^"]+)"\s*\[([^\]]*)\]/g,
    (match, name, attrs) => {
      const isUndoc = undocumented.has(name);
      const fillColor = isUndoc ? "#FFCCCC" : "#CCFFCC";
      const url = `https://github.com/leanprover-community/physlib/blob/master/${name.replace(/\./g, "/")}.lean`;
      let newAttrs = attrs + `, URL="${url}"`;
      if (newAttrs.includes("fillcolor=")) {
        newAttrs = newAttrs.replace(/fillcolor="[^"]+"/, `fillcolor="${fillColor}"`);
      } else if (newAttrs.includes("style=")) {
        newAttrs += `, fillcolor="${fillColor}"`;
      } else {
        newAttrs += `, style=filled, fillcolor="${fillColor}"`;
      }
      return `"${name}" [${newAttrs}]`;
    },
  );

  return dotText;
}

export function DocumentationTrackerClient() {
  const getDot = useCallback(() => buildDot(), []);
  return <GraphvizView getDot={getDot} />;
}
