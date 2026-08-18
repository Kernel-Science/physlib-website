"use client";

import { useEffect, useState } from "react";
import type { ApiMap } from "@/lib/yaml";
import { buildApiMapForest, type ApiMapTreeEntry } from "@/lib/api-map-tree";

function decodeHash(): string {
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function TreeList({
  entries,
  depth,
  activePath,
}: {
  entries: ApiMapTreeEntry[];
  depth: number;
  activePath: string;
}) {
  return (
    <ul className="flex flex-col">
      {entries.map(({ node, children }) => {
        const isActive = node.path === activePath;
        return (
          <li key={node.path}>
            <a
              href={`#${node.path}`}
              title={node.title}
              className={`flex items-center truncate rounded-lg py-1.5 pr-3 text-sm transition-colors ${
                isActive ? "text-accent font-medium" : "text-muted hover:text-foreground"
              }`}
              style={{ letterSpacing: "-0.01em", paddingLeft: `${8 + depth * 16}px` }}
            >
              {isActive && (
                <span className="mr-2 size-1 rounded-full bg-accent flex-shrink-0" />
              )}
              {node.title}
            </a>
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
  const [forest, setForest] = useState<ApiMapTreeEntry[] | null>(null);
  const [activePath, setActivePath] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/api-map")
      .then((res) => res.json())
      .then((data: ApiMap) => {
        if (!cancelled) setForest(buildApiMapForest(data.nodes));
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

  if (!forest || forest.length === 0) return null;

  return (
    <aside className="hidden w-52 shrink-0 lg:block pt-16">
      {/*
       * Widens to fit its content on hover instead of truncating every long
       * title - w-52 -> w-96 is a fixed pixel target (not w-max) so the
       * width transition actually animates; browsers don't tween to/from
       * intrinsic-size keywords like max-content.
       *
       * dir="rtl" moves the vertical scrollbar to this edge - the one
       * against the viewport - rather than the one against <main>, which is
       * also the edge that grows outward on hover; dir="ltr" on the inner
       * wrapper undoes it for the actual content so text stays normal LTR.
       */}
      <nav
        dir="rtl"
        className="sticky top-16 z-10 max-h-[calc(100vh-4rem)] w-52 overflow-y-auto overflow-x-hidden rounded-r-xl py-8 transition-[width] duration-150 ease-out hover:w-96 hover:overflow-x-visible hover:bg-surface hover:shadow-lg"
      >
        <div dir="ltr" className="px-3">
          <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
            APIs
          </p>
          <TreeList entries={forest} depth={0} activePath={activePath} />
        </div>
      </nav>
    </aside>
  );
}
