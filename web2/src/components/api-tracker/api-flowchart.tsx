"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiMapNode } from "@/lib/yaml";
import { buildApiMapForest, type ApiMapTreeEntry } from "@/lib/api-map-tree";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { TopRightArrowIcon } from "@/components/monthly-updates/icons";

const PANEL_WIDTH = 320;
/** Breathing room between the panel and the viewport edge. */
const PANEL_MARGIN = 8;
/** Space left between the panel and the box it describes. */
const PANEL_GAP = 6;
/** Below this, a side counts as cramped and the panel considers flipping. */
const PANEL_COMFORTABLE_HEIGHT = 280;
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
  if (total === 0) {
    return { box: "bg-surface-secondary border-border", label: "No requirements yet" };
  }
  if (done === total) {
    return { box: "bg-success/15 border-success/40", label: "Complete" };
  }
  if (done === 0) {
    return { box: "bg-danger/10 border-danger/30", label: `0/${total} requirements done` };
  }
  return {
    box: "bg-warning/15 border-warning/40",
    label: `${done}/${total} requirements done`,
  };
}

type HoverState = {
  node: ApiMapNode;
  top: number;
  left: number;
  maxHeight: number;
  placement: "below" | "above";
};

/**
 * The details panel for one box. Rendered once, at the flowchart level, and
 * positioned with `fixed` off the hovered box's viewport rect: the flowchart
 * scrolls horizontally, and an `overflow-x` container clips on *both* axes,
 * so a panel nested inside it as a normal absolutely-positioned child gets
 * cut off at the container's edges. `fixed` escapes that clipping entirely.
 */
function DetailsPanel({
  hover,
  panelRef,
  onEnter,
  onLeave,
}: {
  hover: HoverState;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const { node, top, left, maxHeight, placement } = hover;
  const paragraphs = node.overview.split(/\n\s*\n/).filter(Boolean);
  const doneCount = node.requirements.filter((r) => r.done).length;

  return (
    <div
      ref={panelRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        top,
        left,
        width: PANEL_WIDTH,
        // Capped to the room actually available on the chosen side, so a
        // long API's panel scrolls internally instead of running off the
        // top or bottom of the viewport.
        maxHeight,
        // Anchoring by the bottom edge when placed above keeps the panel's
        // gap to the box fixed regardless of how tall its content is.
        ...(placement === "above" ? { transform: "translateY(-100%)" } : null),
      }}
      // overscroll-contain stops a wheel gesture that reaches the panel's end
      // from chaining to the page, which would scroll it and dismiss the panel.
      className="fixed z-50 overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface p-4 text-left shadow-xl"
    >
      <h4 className="mb-1 text-sm font-semibold text-foreground">{node.title}</h4>
      <p className="mb-2 font-mono text-[10px] leading-snug text-muted/70">{node.path}</p>
      {paragraphs.length > 0 && (
        <div className="mb-3 space-y-2 text-xs leading-relaxed text-muted">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted/70">
        Requirements ({doneCount}/{node.requirements.length})
      </p>
      {node.requirements.length > 0 ? (
        <ul className="mb-3 space-y-2">
          {node.requirements.map((r, i) => (
            <li key={i} className="flex gap-1.5 text-xs">
              <span className={`shrink-0 ${r.done ? "text-success" : "text-muted/50"}`}>
                {r.done ? "✓" : "○"}
              </span>
              <span>
                <span className={r.done ? "text-foreground/80" : "text-muted"}>
                  {r.description}
                </span>
                {r.location !== "N/A" && (
                  <span className="mt-0.5 block break-all font-mono text-[10px] text-muted/60">
                    {r.location}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-muted">No requirements defined yet.</p>
      )}
      {node.references.length > 0 && (
        <>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted/70">
            References
          </p>
          <ul className="space-y-1">
            {node.references.map((ref, i) => (
              <li key={i} className="break-words text-[11px] leading-snug text-muted">
                {ref}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FlowNode({
  entry,
  activePath,
  onHover,
  onUnhover,
}: {
  entry: ApiMapTreeEntry;
  activePath: string;
  onHover: (node: ApiMapNode, boxEl: HTMLElement) => void;
  onUnhover: () => void;
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
    <li className="api-tree__node">
      <span className="api-tree__arrow" aria-hidden />
      {/* A dedicated wrapper, sized to match the box exactly, so the corner
          icon positions off the box itself rather than off this <li> - which
          can be much wider than the box whenever a sibling branch has
          deeper/wider descendants (see the connector CSS in globals.css for
          the same box-vs-li distinction). */}
      <div
        className="relative w-44"
        onMouseEnter={node ? (e) => onHover(node, e.currentTarget) : undefined}
        onMouseLeave={node ? onUnhover : undefined}
      >
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
            className={`truncate pr-4 text-sm font-medium ${node ? "text-foreground" : "text-muted italic"}`}
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
        {node && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            title="View API-map.yaml on GitHub"
            className="absolute right-1.5 top-1.5 rounded p-0.5 text-muted/60 hover:bg-surface hover:text-accent"
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
              onHover={onHover}
              onUnhover={onUnhover}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ApiFlowchart({ nodes }: { nodes: ApiMapNode[] }) {
  const [activePath, setActivePath] = useState("");
  const [hover, setHover] = useState<HoverState | null>(null);
  // Closing is delayed so the pointer can cross the gap between a box and its
  // panel without the panel vanishing mid-travel.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const handleHover = useCallback(
    (node: ApiMapNode, boxEl: HTMLElement) => {
      cancelClose();
      const rect = boxEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - PANEL_MARGIN;
      const spaceAbove = rect.top - PANEL_GAP - PANEL_MARGIN;
      // Prefer below (the panel then reads as hanging off the box), but flip
      // above when below is cramped and above genuinely has more room.
      const placement: "below" | "above" =
        spaceBelow < PANEL_COMFORTABLE_HEIGHT && spaceAbove > spaceBelow ? "above" : "below";
      const left = Math.min(
        Math.max(PANEL_MARGIN, rect.left + rect.width / 2 - PANEL_WIDTH / 2),
        window.innerWidth - PANEL_WIDTH - PANEL_MARGIN,
      );
      setHover({
        node,
        left,
        top: placement === "below" ? rect.bottom + PANEL_GAP : rect.top - PANEL_GAP,
        maxHeight: Math.max(120, placement === "below" ? spaceBelow : spaceAbove),
        placement,
      });
    },
    [cancelClose],
  );

  const handleUnhover = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHover(null), 120);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // A fixed-position panel doesn't travel with the content it's anchored to,
  // so it has to go away once that content moves.
  useEffect(() => {
    if (!hover) return;
    const onScroll = (e: Event) => {
      // Capture phase is required to see scrolls of nested containers (scroll
      // events don't bubble), but that also surfaces the panel's *own*
      // overflow scrolling - which must not close the very panel the reader
      // is scrolling through.
      const target = e.target;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      setHover(null);
    };
    const onResize = () => setHover(null);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [hover]);

  useEffect(() => {
    const onHashChange = () => {
      const path = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      setActivePath(path);
      if (!path) return;
      // Deferred a frame so the re-render triggered by setActivePath above
      // (which changes classes on both the previously and newly active box)
      // lands before the scroll animation starts.
      requestAnimationFrame(() => {
        const el = document.getElementById(path);
        if (el) centerHorizontally(el);
      });
    };
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const forest = buildApiMapForest(nodes);

  return (
    <>
      <div
        data-api-flowchart-scroller
        className="overflow-x-auto rounded-xl border border-border bg-surface"
      >
        <ul className="api-tree">
          {forest.map((entry) => (
            <FlowNode
              key={entry.path}
              entry={entry}
              activePath={activePath}
              onHover={handleHover}
              onUnhover={handleUnhover}
            />
          ))}
        </ul>
      </div>
      {hover && (
        <DetailsPanel
          hover={hover}
          panelRef={panelRef}
          onEnter={cancelClose}
          onLeave={handleUnhover}
        />
      )}
    </>
  );
}
