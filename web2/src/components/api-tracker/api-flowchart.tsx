"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ApiMapNode } from "@/lib/yaml";
import { buildFolderTree, flattenFolderTree } from "@/lib/api-map-folders";
import { buildApiMapForest, type ApiMapTreeEntry } from "@/lib/api-map-tree";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { API_STATUS_DOT, apiStatusKind } from "@/lib/api-map-status";
import { TopRightArrowIcon } from "@/components/monthly-updates/icons";

const views = [
  { value: "selected", label: "List View" },
  { value: "full", label: "Graph View" },
] as const;

type MapLink = { path: string; title: string; node?: ApiMapNode };

function MapLinks({ items, activePath }: { items: MapLink[]; activePath: string }) {
  return (
    <ul className="divide-y divide-border">
      {items.map(({ path, title, node }) => (
        <li key={path}>
          <a
            href={`#${path}`}
            aria-current={path === activePath ? "true" : undefined}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              selectApiMapEntry(path);
            }}
            className="flex items-start gap-2 rounded px-2 py-2 text-sm hover:bg-surface-secondary aria-[current=true]:text-accent"
          >
            <span
              aria-hidden
              className={`mt-1.5 size-2 shrink-0 rounded-full ${
                node ? API_STATUS_DOT[apiStatusKind(node)] : "border border-dashed border-muted"
              }`}
            />
            <span className="min-w-0 break-words">
              <span className="block font-medium">{title}</span>
              <span className="block text-xs text-muted">
                {node ? statusStyle(node).label : "Article missing"}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function SelectedApi({ nodes, activePath }: { nodes: ApiMapNode[]; activePath: string }) {
  const byPath = new Map(nodes.map((node) => [node.path, node]));
  const referenced = nodes.flatMap((node) => node.parents).find((entry) => entry.path === activePath);
  const selected = byPath.get(activePath) ??
    (referenced ? undefined : flattenFolderTree(buildFolderTree(nodes))[0]);
  const path = selected?.path ?? referenced?.path;
  if (!path) return <p className="text-sm text-muted">No Wiki articles yet.</p>;

  const citations = selected?.parents.map(({ path, name }) => ({
    path, title: byPath.get(path)?.title ?? name, node: byPath.get(path),
  })) ?? [];
  const citedBy = nodes
    .filter((node) => node.parents.some((parent) => parent.path === path))
    .map((node) => ({ path: node.path, title: node.title, node }));

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="mb-4 font-semibold">{selected?.title ?? referenced?.name}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {[{ title: "Cites", items: citations }, { title: "Cited by", items: citedBy }].map(
          ({ title, items }) => (
            <section key={title} className="min-w-0 border-t border-border pt-2">
              <h4 className="mb-1 text-xs font-medium text-muted">{title} · {items.length}</h4>
              {items.length ? <MapLinks items={items} activePath={activePath} /> : (
                <p className="px-2 py-2 text-sm text-muted">None</p>
              )}
            </section>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Centers a box in the flowchart's viewport by scrolling only the flowchart's
 * own horizontal scroller. Deliberately not `el.scrollIntoView` even with
 * `block: "nearest"`: that is free to scroll the *page* vertically too, and
 * selecting an API should never move the page under the reader.
 *
 * Clamping to the scroll range is what makes centering best-effort: boxes in
 * the first or last screenful settle flush against that end instead.
 */
function centerHorizontally(el: HTMLElement): void {
  const container = el.closest<HTMLElement>("[data-api-flowchart-scroller]");
  if (!container) return;
  const box = el.getBoundingClientRect();
  const view = container.getBoundingClientRect();
  // The box's midpoint in the scroller's own content coordinates.
  const boxCenter = container.scrollLeft + (box.left - view.left) + box.width / 2;
  const left = Math.max(
    0,
    Math.min(
      boxCenter - container.clientWidth / 2,
      container.scrollWidth - container.clientWidth,
    ),
  );
  if (Math.abs(left - container.scrollLeft) > 1) {
    container.scrollTo({ left, behavior: "smooth" });
  }
}

function statusStyle(node: ApiMapNode): { box: string; label: string } {
  const total = node.requirements.length;
  const done = node.requirements.filter((r) => r.done).length;
  switch (apiStatusKind(node)) {
    case "none":
      return { box: "bg-surface-secondary border-border", label: "No claims yet" };
    case "complete":
      return { box: "bg-success/15 border-success/40", label: "Complete" };
    case "unstarted":
      return { box: "bg-danger/10 border-danger/30", label: `0/${total} claims formalized` };
    case "partial":
      return {
        box: "bg-warning/15 border-warning/40",
        label: `${done}/${total} claims formalized`,
      };
  }
}

function FlowNode({
  entry,
  activePath,
  onSelect,
}: {
  entry: ApiMapTreeEntry;
  activePath: string;
  onSelect: (path: string, boxEl: HTMLElement) => void;
}) {
  const { path, title, node, children, primaryParentPath } = entry;
  const isActive = path === activePath;

  // Only one parent becomes this box's connector line (see api-map-tree.ts);
  // any others are still real dependencies, so surface them as text instead
  // of silently dropping them.
  const otherParents = node ? node.parents.filter((p) => p.path !== primaryParentPath) : [];

  const style = node
    ? statusStyle(node)
    : { box: "border-dashed border-border bg-surface-secondary/60", label: "Article missing" };

  return (
    <li className="api-tree__node">
      <span className="api-tree__arrow" aria-hidden />
      {/* A dedicated wrapper, sized to match the box exactly, so the corner
          icon positions off the box itself rather than off this <li> - which
          can be much wider than the box whenever a sibling branch has
          deeper/wider descendants (see the connector CSS in globals.css for
          the same box-vs-li distinction). */}
      <div className="relative w-44">
        <a
          // Not the bare path: the URL hash is the path, and a matching id
          // would make the browser jump down here on every link to an API.
          id={`flow-${path}`}
          href={`#${path}`}
          onClick={(e) => {
            e.preventDefault();
            onSelect(path, e.currentTarget);
          }}
          title={node ? title : `${title} (article missing)`}
          className={`flex w-44 flex-col gap-0.5 rounded-lg border px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md ${style.box} ${
            isActive ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
          }`}
        >
          <span
            className={`truncate pr-4 text-sm font-medium ${node ? "text-foreground" : "text-muted italic"}`}
          >
            {title}
          </span>
          <span className="truncate text-[11px] text-muted">{style.label}</span>
          {otherParents.length > 0 && (
            <span className="line-clamp-2 text-[10px] leading-snug text-muted/70">
              Also cites: {otherParents.map((p) => p.name).join(", ")}
            </span>
          )}
        </a>
        {node && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            title="View the Wiki article on GitHub"
            className="absolute right-1.5 top-1.5 rounded-(--radius) p-0.5 text-muted/60 hover:bg-surface hover:text-accent"
          >
            <TopRightArrowIcon className="size-3" />
          </a>
        )}
      </div>
      {children.length > 0 && (
        <ul className="api-tree__branch">
          {children.map((child) => (
            <FlowNode
              key={child.path}
              entry={child}
              activePath={activePath}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ApiFlowchart({ nodes }: { nodes: ApiMapNode[] }) {
  const [activePath, setActivePath] = useState("");
  const [view, setView] = useState<(typeof views)[number]["value"]>("selected");
  const scroller = useRef<HTMLDivElement>(null);

  function stepGraph(direction: -1 | 1) {
    const panel = scroller.current;
    if (panel) panel.scrollBy({ left: direction * panel.clientWidth * 0.8, behavior: "smooth" });
  }

  /**
   * Selecting from the map changes the detail card *above* the map, and that
   * card's height varies a lot between APIs - so the map itself gets pushed
   * up or down under the pointer even though the scroll position never
   * changed. Record where the clicked box sat in the viewport, then put it
   * back after the re-render, so the map appears to stay still.
   */
  const anchor = useRef<{ el: HTMLElement; top: number } | null>(null);

  const handleSelect = useCallback((path: string, boxEl: HTMLElement) => {
    anchor.current = { el: boxEl, top: boxEl.getBoundingClientRect().top };
    selectApiMapEntry(path);
  }, []);

  // No dependency array: this must run after whichever commit actually
  // resized the card, and it no-ops unless a map click armed the anchor.
  // useLayoutEffect (not useEffect) so the correction lands in the same frame
  // as the mutation that caused the shift - otherwise the jump is painted
  // first and the fix reads as a flicker.
  useLayoutEffect(() => {
    const pending = anchor.current;
    if (!pending) return;
    anchor.current = null;
    const delta = pending.el.getBoundingClientRect().top - pending.top;
    if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "auto" });
  });

  useEffect(() => {
    const onHashChange = () => {
      const path = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      setActivePath(path);
      if (!path) return;
      // Deferred a frame so the re-render triggered by setActivePath above
      // (which changes classes on both the previously and newly active box)
      // lands before the scroll animation starts.
      requestAnimationFrame(() => {
        const el = document.getElementById(`flow-${path}`);
        if (el) centerHorizontally(el);
      });
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [view]);

  const forest = useMemo(() => view === "full" ? buildApiMapForest(nodes) : [], [nodes, view]);

  return (
    <>
      <div aria-label="Dependency map view" role="group" className="mb-4 flex flex-wrap gap-2">
        {views.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className="rounded-(--radius) border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground aria-pressed:border-accent aria-pressed:text-accent"
          >
            {label}
          </button>
        ))}
      </div>
      {view === "selected" && <SelectedApi nodes={nodes} activePath={activePath} />}
      {view === "full" && (
        <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted">Dashed boxes mark cited topics without a Wiki article.</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => stepGraph(-1)} aria-label="Scroll graph left"
                className="size-8 rounded-(--radius) border border-border text-muted hover:text-accent">←</button>
              <button type="button" onClick={() => stepGraph(1)} aria-label="Scroll graph right"
                className="size-8 rounded-(--radius) border border-border text-muted hover:text-accent">→</button>
            </div>
          </div>
          <div
            ref={scroller}
            data-api-flowchart-scroller
            className="overflow-x-auto rounded-xl border border-border bg-surface"
          >
            <ul className="api-tree w-max min-w-full">
              {forest.map((entry) => (
                <FlowNode
                  key={entry.path}
                  entry={entry}
                  activePath={activePath}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}
