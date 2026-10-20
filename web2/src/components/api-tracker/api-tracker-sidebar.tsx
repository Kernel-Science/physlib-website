"use client";

import { useEffect, useState } from "react";
import type { ApiMap } from "@/lib/yaml";
import { buildFolderTree, type FolderEntry } from "@/lib/api-map-folders";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { API_STATUS_DOT, apiStatusKind } from "@/lib/api-map-status";

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
                title={`${label} (${path})`}
                className={`flex items-center truncate rounded-lg py-1.5 pr-3 text-sm transition-colors ${
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
                {label}
              </a>
            ) : (
              // A folder with no map of its own: a label for the maps below.
              <span
                className="flex items-center truncate py-1.5 pr-3 font-mono text-[11px] text-muted/70"
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
    <aside className="hidden w-52 shrink-0 lg:block pt-16">
      {/*
       * <aside> itself stays a fixed w-52 (13rem) - that's what the flex
       * layout reserves, so it doesn't push <main>'s centered max-w-5xl
       * content over. <nav> is the visible piece and is free to overflow
       * past <aside>'s edge without affecting layout (same trick the hover
       * state below already used) - by default it grows to fill the gutter
       * up to where that centered content starts, instead of leaving it
       * blank. <main> is `100vw - 13rem` wide (the aside's fixed w-52, not
       * the nav's own width) and centers the max-w-5xl content in it, whose
       * own px-4 adds 16px before text starts, so that text starts at
       * `13rem + (100vw - 13rem - 1024px)/2 + 16px = 50vw - 392px` from the
       * viewport's left. The nav takes `50vw - 400px`, leaving 8px of air
       * (and room for a scrollbar inside 100vw). If page.tsx's max-w-5xl/px-4
       * or the aside's w-52 ever change, this needs to move with them.
       * Clamped so it never shrinks below the old fixed w-52, or grows
       * past a sensible cap - hover still goes wider still (24rem), to fit
       * whatever's still truncated at the clamp's max.
       *
       * dir="rtl" moves the vertical scrollbar to this edge - the one
       * against the viewport - rather than the one against <main>, which is
       * also the edge that grows outward on hover; dir="ltr" on the inner
       * wrapper undoes it for the actual content so text stays normal LTR.
       */}
      <nav
        dir="rtl"
        className="sticky top-16 z-10 max-h-[calc(100vh-4rem)] w-[clamp(13rem,calc(50vw-400px),20rem)] overflow-y-auto overflow-x-hidden rounded-r-xl py-8 transition-[width] duration-150 ease-out hover:w-96 hover:overflow-x-visible hover:bg-surface hover:shadow-lg"
      >
        <div dir="ltr" className="px-3">
          {/* One section per library, laid out as its folders are. */}
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
    </aside>
  );
}
