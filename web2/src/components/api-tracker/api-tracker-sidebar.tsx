"use client";

import { useEffect, useState } from "react";
import type { ApiMap } from "@/lib/yaml";
import { buildFolderTree, type FolderEntry } from "@/lib/api-map-folders";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { API_STATUS_DOT, API_STATUS_LABEL, apiStatusKind } from "@/lib/api-map-status";

function decodeHash(): string {
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function TreeList({
  entries,
  depth,
  activePath,
}: {
  entries: FolderEntry[];
  depth: number;
  activePath: string;
}) {
  return (
    <ul className="flex flex-col">
      {entries.map(({ path, label, node, children }) => {
        const isActive = path === activePath;
        const indent = { paddingLeft: `${8 + depth * 14}px` };
        return (
          <li key={path}>
            {node ? (
              <a
                href={`/api-tracker#${path}`}
                onClick={(e) => {
                  // Elsewhere under /api-tracker (the create page) this is an
                  // ordinary link back to the map.
                  if (window.location.pathname !== "/api-tracker") return;
                  e.preventDefault();
                  selectApiMapEntry(path);
                }}
                title={label}
                className={`flex items-center rounded-lg py-1.5 pr-3 text-sm transition-colors ${
                  isActive ? "text-accent font-medium" : "text-muted hover:text-foreground"
                }`}
                style={{ letterSpacing: "-0.01em", ...indent }}
              >
                {/* Status dot, matching the colour of this API's flowchart
                    box. The dot carries status here, so the active row is
                    marked by its accent text alone rather than by an accent
                    dot as in the other sidebars. */}
                <span
                  aria-hidden
                  className={`mr-2 size-1.5 shrink-0 rounded-full ${API_STATUS_DOT[apiStatusKind(node)]}`}
                />
                <span className="min-w-0 truncate">{label}</span>
                <span className="sr-only"> ({API_STATUS_LABEL[apiStatusKind(node)]})</span>
              </a>
            ) : (
              // A folder with no map of its own: a label for the maps below.
              <span
                className="block truncate py-1.5 pr-3 font-mono text-[11px] text-muted/70"
                style={indent}
                title={path}
              >
                {label}/
              </span>
            )}
            {children.length > 0 && (
              <TreeList entries={children} depth={depth + 1} activePath={activePath} />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ApiTrackerSidebar() {
  const [tree, setTree] = useState<FolderEntry[] | null>(null);
  const [activePath, setActivePath] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/api-map")
      .then((res) => res.json())
      .then((data: ApiMap) => {
        if (!cancelled) setTree(buildFolderTree(data.nodes));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setActivePath(decodeHash());
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (!tree || tree.length === 0) return null;

  return (
    <aside className="hidden w-56 shrink-0 pt-16 lg:block xl:w-64">
      <div className="sticky top-16 mb-4 flex max-h-[calc(100dvh-5rem)] flex-col pt-6">
        <nav
          id="api-map-sidebar"
          aria-label="API maps"
          className="min-h-0 overflow-y-auto overflow-x-hidden pb-5 [mask-image:linear-gradient(to_bottom,black_calc(100%-1rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="pr-3 pl-6">
            {tree.map((root, i) => (
              <div key={root.path} className={i > 0 ? "mt-5" : ""}>
                <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
                  {root.label}
                </p>
                <TreeList
                  entries={root.node ? [{ ...root, children: [] }, ...root.children] : root.children}
                  depth={0}
                  activePath={activePath}
                />
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
