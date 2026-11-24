"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GraphvizView,
  loadImportGraphDot,
  preloadGraphvizEngine,
} from "@/components/graphviz-view";

const repository = "leanprover-community/physlib";
const sourceRoot = `https://github.com/${repository}/blob/master/`;
const exemptionsPath = "scripts/lint/exemptions/module_doc_no_lint.txt";

async function fetchExemptions(signal: AbortSignal): Promise<string[]> {
  const response = await fetch(
    `https://raw.githubusercontent.com/${repository}/master/${exemptionsPath}`,
    { signal },
  );
  if (!response.ok) throw new Error("Failed to load documentation exemptions");
  const paths = (await response.text()).split("\n").map((line) => line.trim()).filter(Boolean);
  if (paths.some((path) => !path.endsWith(".lean") || path.split("/").some(
    (part) => !part || part === "." || part === "..",
  ))) {
    throw new Error("Invalid documentation exemptions list");
  }
  return [...new Set(paths)].sort();
}

function sourceUrl(path: string) {
  return sourceRoot + path.split("/").map(encodeURIComponent).join("/");
}

async function buildDot(files: string[] | null): Promise<string> {
  const undocumented = files && new Set(files);
  const dotText = await loadImportGraphDot();
  return dotText.replace(
    /"([^"]+)"\s*\[([^\]]*)\]/g,
    (match, name: string, attrs: string) => {
      const path = name.replace(/\./g, "/") + ".lean";
      let newAttrs = attrs + `, URL="${sourceUrl(path)}"`;
      if (undocumented) {
        const fillColor = undocumented.has(path) ? "#FFCCCC" : "#CCFFCC";
        if (newAttrs.includes("fillcolor=")) {
          newAttrs = newAttrs.replace(/fillcolor="[^"]+"/, `fillcolor="${fillColor}"`);
        } else if (newAttrs.includes("style=")) {
          newAttrs += `, fillcolor="${fillColor}"`;
        } else {
          newAttrs += `, style=filled, fillcolor="${fillColor}"`;
        }
      }
      return `"${name}" [${newAttrs}]`;
    },
  );
}

export function DocumentationTrackerClient({ showFiles = true }: { showFiles?: boolean }) {
  const [files, setFiles] = useState<string[] | null>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    // The graph needs three things: the engine, the import graph, and the
    // exemption list from GitHub. Ask for all three at once.
    preloadGraphvizEngine().catch(() => {});
    loadImportGraphDot().catch(() => {});

    const controller = new AbortController();
    let unmounted = false;
    // The list only colours the graph, so don't let a slow or blocked
    // raw.githubusercontent.com hold the graph back indefinitely.
    const timeout = setTimeout(() => controller.abort(), 8000);
    fetchExemptions(controller.signal)
      .then(setFiles)
      .catch(() => {
        if (!unmounted) setFiles(null);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      unmounted = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  // null until the exemption list has loaded or failed: the graph view shows
  // its loading state at full size meanwhile, so the page doesn't jump.
  const getDot = useMemo(
    () => (files === undefined ? null : () => buildDot(files)),
    [files],
  );
  const needle = query.trim().toLowerCase();
  const matches = files?.filter((path) => path.toLowerCase().includes(needle));

  return (
    <>
      {showFiles && (
        <section aria-labelledby="files-needing-documentation" className="mb-8">
          <h2 id="files-needing-documentation" className="text-xl font-semibold mb-2 scroll-mt-24">
            Files needing documentation
          </h2>
          <p className="text-sm text-muted mb-3">
            Browse files on the{" "}
            <a href={sourceUrl(exemptionsPath)} className="text-accent hover:underline">
              module documentation exemption list
            </a>.
          </p>
          {files === undefined && <p role="status" className="text-sm text-muted">Loading files…</p>}
          {files === null && (
            <p role="status" className="text-sm text-muted">
              The exemption list could not be loaded. Documentation status is unavailable.
            </p>
          )}
          {files && matches && (
            <>
              <label htmlFor="documentation-file-search" className="block text-sm font-medium mb-1">
                Search by filename or path
              </label>
              <input
                id="documentation-file-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="site-field w-full"
              />
              <p role="status" className="my-2 text-sm text-muted">
                {needle
                  ? `${matches.length} of ${files.length} files`
                  : `${files.length} ${files.length === 1 ? "file" : "files"}`}
              </p>
              {matches.length ? (
                <ul className="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border">
                  {matches.map((path) => (
                    <li key={path}>
                      <a
                        href={sourceUrl(path)}
                        className="block break-all px-3 py-2 font-mono text-xs text-accent hover:bg-surface hover:underline"
                      >
                        {path}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  {files.length ? "No files match your search." : "The exemption list is empty."}
                </p>
              )}
            </>
          )}
        </section>
      )}
      <section aria-labelledby="import-graph">
        <h2 id="import-graph" className="text-xl font-semibold mb-2 scroll-mt-24">Import graph</h2>
        <p className="mb-3 text-sm leading-relaxed text-foreground/70">
          See which Lean files import each other.{" "}
          {files && (
            <>
              <span className="text-danger font-medium">Red nodes</span> are on the exemption list.{" "}
              <span className="text-success font-medium">Green nodes</span> are outside it.{" "}
            </>
          )}
          An arrow from A to B means B imports A.
        </p>
        <GraphvizView getDot={getDot} label="Lean module import graph" emptyMessage="The import graph is empty." />
      </section>
    </>
  );
}
