"use client";

import { useCallback, useEffect, useState } from "react";
import { GraphvizView } from "@/components/graphviz-view";

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
  const response = await fetch("/my_graph.dot");
  if (!response.ok) throw new Error("Failed to load the import graph");

  const undocumented = files && new Set(files);
  const dotText = await response.text();
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

export function DocumentationTrackerClient() {
  const [files, setFiles] = useState<string[] | null>();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchExemptions(controller.signal)
      .then(setFiles)
      .catch(() => {
        if (!controller.signal.aborted) setFiles(null);
      });
    return () => controller.abort();
  }, []);

  const getDot = useCallback(() => buildDot(files ?? null), [files]);
  const needle = query.trim().toLowerCase();
  const matches = files?.filter((path) => path.toLowerCase().includes(needle));

  return (
    <>
      <section aria-labelledby="files-needing-documentation" className="mb-8">
        <h2 id="files-needing-documentation" className="text-xl font-semibold mb-2">
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
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
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
      <section aria-labelledby="import-graph">
        <h2 id="import-graph" className="text-xl font-semibold mb-2">Import graph</h2>
        <p className="text-sm text-muted mb-3">
          {files && (
            <>
              <span className="text-danger font-medium">Red nodes</span> are on the exemption list.{" "}
              <span className="text-success font-medium">Green nodes</span> are outside it.{" "}
            </>
          )}
          Drag to pan or scroll to zoom. Select a file to view its source.
        </p>
        {files !== undefined && <GraphvizView getDot={getDot} />}
      </section>
    </>
  );
}
