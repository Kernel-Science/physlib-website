"use client";

import { useEffect, useState } from "react";
import type { ApiMap } from "@/lib/yaml";
import { buildApiMapForest, type ApiMapTreeEntry } from "@/lib/api-map-tree";
import { selectApiMapEntry } from "@/lib/api-map-hash";

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
      {entries.map(({ path, title, node, children }) => {
        const isActive = path === activePath;
        const isPhantom = node === null;
        return (
          <li key={path}>
            <a
              href={`#${path}`}
              onClick={(e) => {
                e.preventDefault();
                selectApiMapEntry(path);
              }}
              title={isPhantom ? `${title} (no API-map.yaml yet)` : title}
              className={`flex items-center truncate rounded-lg py-1.5 pr-3 text-sm transition-colors ${
                isActive
                  ? "text-accent font-medium"
                  : isPhantom
                    ? "text-muted/60 italic hover:text-muted"
                    : "text-muted hover:text-foreground"
              }`}
              style={{ letterSpacing: "-0.01em", paddingLeft: `${8 + depth * 16}px` }}
            >
              {isActive && (
                <span className="mr-2 size-1 rounded-full bg-accent flex-shrink-0" />
              )}
              {title}
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
       * <aside> itself stays a fixed w-52 (13rem) - that's what the flex
       * layout reserves, so it doesn't push <main>'s centered max-w-5xl
       * content over. <nav> is the visible piece and is free to overflow
       * past <aside>'s edge without affecting layout (same trick the hover
       * state below already used) - by default it grows to fill the gutter
       * up to where that centered content starts, instead of leaving it
       * blank. That gap is `(mainWidth - 1024px)/2`, mainWidth is
       * `100vw - asideWidth`, and the content itself adds another 16px of
       * its own px-4 before text starts - solving default-width = gap for a
       * self-consistent width gives calc(100vw - 992px). If page.tsx's
       * max-w-5xl/px-4 ever changes, this 992 needs to move with it.
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
        className="sticky top-16 z-10 max-h-[calc(100vh-4rem)] w-[clamp(13rem,calc(100vw-992px),20rem)] overflow-y-auto overflow-x-hidden rounded-r-xl py-8 transition-[width] duration-150 ease-out hover:w-96 hover:overflow-x-visible hover:bg-surface hover:shadow-lg"
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
