"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3: any;
    Graphviz: unknown;
  }
}

// Keyed by src, so repeat calls - e.g. React Strict Mode's dev-only
// mount/unmount/remount cycle - await the *same* load rather than each
// racing to check "is a <script> tag already in the DOM", which is true
// well before that tag's own load event has actually fired.
const scriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let promise = scriptLoads.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
    scriptLoads.set(src, promise);
  }
  return promise;
}

type NodeEntry = {
  name: string;
  el: SVGGraphicsElement;
};

const HIGHLIGHT_STROKE = "#2563eb";
const HIGHLIGHT_WIDTH = "3";
const READ_SCALE = 1.4;
const ZOOM_STEP = 1.4;
const ZOOM_EXTENT: [number, number] = [0.02, 12];

type Props = {
  getDot: () => Promise<string>;
  height?: string;
};

export function GraphvizView({ getDot, height = "70vh" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphvizRef = useRef<any>(null);
  const nodeIndexRef = useRef<NodeEntry[]>([]);
  const highlightedRef = useRef<SVGGraphicsElement[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialTransformRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<NodeEntry[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [searched, setSearched] = useState(false);

  const clearHighlights = useCallback(() => {
    for (const el of highlightedRef.current) {
      const ellipse = el.querySelector("ellipse, polygon");
      ellipse?.removeAttribute("stroke");
      ellipse?.removeAttribute("stroke-width");
    }
    highlightedRef.current = [];
  }, []);

  const applyHighlights = useCallback(
    (entries: NodeEntry[]) => {
      clearHighlights();
      for (const entry of entries) {
        const ellipse = entry.el.querySelector("ellipse, polygon");
        ellipse?.setAttribute("stroke", HIGHLIGHT_STROKE);
        ellipse?.setAttribute("stroke-width", HIGHLIGHT_WIDTH);
      }
      highlightedRef.current = entries.map((e) => e.el);
    },
    [clearHighlights],
  );

  const jumpToEntry = useCallback((entry: NodeEntry, scale?: number) => {
    const gv = graphvizRef.current;
    const zoomBehavior = gv?.zoomBehavior();
    const zoomSelection = gv?.zoomSelection();
    if (!zoomBehavior || !zoomSelection || !containerRef.current) return;

    const bbox = entry.el.getBBox();
    const nodeX = bbox.x + bbox.width / 2;
    const nodeY = bbox.y + bbox.height / 2;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const targetScale = scale ?? READ_SCALE;

    const transform = window
      .d3!.zoomIdentity.translate(cw / 2, ch / 2)
      .scale(targetScale)
      .translate(-nodeX, -nodeY);

    zoomBehavior.transform(zoomSelection, transform);
  }, []);

  const runSearch = useCallback(
    (raw: string, jump: boolean) => {
      const q = raw.trim().toLowerCase();
      setSearched(q.length > 0);
      if (!q) {
        setMatches([]);
        setMatchIndex(0);
        clearHighlights();
        return;
      }
      const found = nodeIndexRef.current.filter((n) =>
        n.name.toLowerCase().includes(q),
      );
      setMatches(found);
      setMatchIndex(0);
      applyHighlights(found);
      if (jump && found[0]) jumpToEntry(found[0]);
    },
    [applyHighlights, clearHighlights, jumpToEntry],
  );

  const goToMatch = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
      const next = (matchIndex + delta + matches.length) % matches.length;
      setMatchIndex(next);
      jumpToEntry(matches[next]);
    },
    [matches, matchIndex, jumpToEntry],
  );

  const zoomBy = useCallback((factor: number) => {
    const gv = graphvizRef.current;
    const zoomBehavior = gv?.zoomBehavior();
    const zoomSelection = gv?.zoomSelection();
    if (!zoomBehavior || !zoomSelection || !containerRef.current) return;
    // scaleBy's default zoom-around point is the center of the *SVG
    // element's own* box — which is the native (huge) graph size, not the
    // visible container — so it has to be given explicitly here.
    const point: [number, number] = [
      containerRef.current.clientWidth / 2,
      containerRef.current.clientHeight / 2,
    ];
    zoomBehavior.scaleBy(zoomSelection, factor, point);
  }, []);

  const resetView = useCallback(() => {
    const gv = graphvizRef.current;
    const zoomBehavior = gv?.zoomBehavior();
    const zoomSelection = gv?.zoomSelection();
    if (!zoomBehavior || !zoomSelection || !initialTransformRef.current) return;
    zoomBehavior.transform(zoomSelection, initialTransformRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadScript("https://d3js.org/d3.v7.min.js");
        await loadScript(
          "https://unpkg.com/@hpcc-js/wasm@2.20.0/dist/graphviz.umd.js",
        );
        // d3-graphviz v5 resolves @hpcc-js/wasm via window["@hpcc-js/wasm"],
        // but the UMD bundle registers itself as window.hpcc — bridge the gap.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)["@hpcc-js/wasm"] = (window as any).hpcc;
        await loadScript(
          "https://unpkg.com/d3-graphviz@5.6.0/build/d3-graphviz.js",
        );

        if (cancelled || !containerRef.current) return;

        const dot = await getDot();
        if (cancelled || !containerRef.current) return;

        setLoading(false);

        // Deliberately don't set .fit()/.width()/.height() here: those make
        // d3-graphviz leave the SVG's viewBox at its native size while
        // stretching the width/height attrs to the container via CSS. That
        // mismatch between "pixels the pointer moves in" and "units the pan
        // transform is expressed in" makes drag-to-pan track the cursor at
        // the wrong rate. Instead we render at native scale (viewBox ==
        // pixel size, so 1:1 tracking) and set the *zoom transform* below.
        const gv = window
          .d3!.select(containerRef.current)
          .graphviz()
          .zoom(true)
          .zoomScaleExtent(ZOOM_EXTENT)
          .engine("dot");

        graphvizRef.current = gv;

        gv.on("end", () => {
          if (cancelled || !containerRef.current) return;
          const svg: SVGSVGElement | null =
            containerRef.current.querySelector("svg");
          if (!svg) return;

          // Graphviz emits width/height in "pt", which browsers convert to
          // px at a fixed 4/3 ratio — a second scale factor layered on top
          // of the viewBox, independent of our zoom transform's own scale.
          // Strip the units so 1 viewBox unit == 1 px == 1 zoom-transform
          // unit; that's what keeps the math below (and pointer dragging)
          // consistent.
          const viewBox = (svg.getAttribute("viewBox") ?? "")
            .split(/\s+/)
            .map(Number);
          const [, , vbWidth, vbHeight] = viewBox;
          if (vbWidth && vbHeight) {
            svg.setAttribute("width", String(vbWidth));
            svg.setAttribute("height", String(vbHeight));
          }

          // Build a searchable index of node names -> elements. Graphviz
          // emits a <title> for every node and edge; edges look like
          // "A->B" so filter those out.
          const entries: NodeEntry[] = [];
          svg.querySelectorAll("title").forEach((titleEl) => {
            const name = titleEl.textContent ?? "";
            if (!name || name.includes("->")) return;
            const parent = titleEl.parentElement as SVGGraphicsElement | null;
            if (parent) entries.push({ name, el: parent });
          });
          nodeIndexRef.current = entries;

          // Fit the graph's height to the container so the initial view is
          // an overview rather than a single native-scale corner. Built as
          // an absolute transform (not a relative scaleBy) because d3-zoom's
          // default zoom-around point for scaleBy is the *element's own*
          // center — which, before any width/height fixup, is the native
          // (huge) SVG box, not the visible container.
          //
          // Graphviz's node coordinates are NOT 0-based — they live in
          // whatever raw coordinate space the layout engine picked (often
          // with negative values), and it's the top-level <g>'s own
          // translate — which we're about to overwrite — that normally
          // shifts them into the visible 0..viewBox range. So measure the
          // graph's actual content box via getBBox() rather than assuming
          // it spans (0,0)..(vbWidth,vbHeight); this is also the same
          // coordinate space getBBox() returns for individual nodes in
          // jumpToEntry, keeping both consistent.
          const zoomBehavior = gv.zoomBehavior();
          const zoomSelection = gv.zoomSelection();
          const graphG = svg.querySelector("g") as SVGGraphicsElement | null;
          if (zoomBehavior && zoomSelection && containerRef.current && graphG) {
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const bbox = graphG.getBBox();
            const fitScale = Math.min(
              ZOOM_EXTENT[1],
              Math.max(ZOOM_EXTENT[0], ch / (bbox.height || 1)),
            );
            const domainCenterX = bbox.x + bbox.width / 2;
            const domainCenterY = bbox.y + bbox.height / 2;
            const transform = window
              .d3!.zoomIdentity.translate(cw / 2, ch / 2)
              .scale(fitScale)
              .translate(-domainCenterX, -domainCenterY);
            zoomBehavior.transform(zoomSelection, transform);
            initialTransformRef.current = transform;
          }
        });

        gv.renderDot(dot);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load the graph. Please refresh the page.");
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [getDot]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value, false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (matches.length > 0) goToMatch(1);
              else runSearch(query, true);
            }
          }}
          placeholder="Search for a file…"
          className="flex-1 min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        {searched && (
          <span className="text-xs text-muted whitespace-nowrap">
            {matches.length === 0
              ? "No matches"
              : `${matchIndex + 1} / ${matches.length}`}
          </span>
        )}
        {matches.length > 1 && (
          <div className="flex gap-1">
            <button
              onClick={() => goToMatch(-1)}
              className="rounded-lg border border-border px-2 py-1 text-sm hover:bg-surface"
              aria-label="Previous match"
            >
              ↑
            </button>
            <button
              onClick={() => goToMatch(1)}
              className="rounded-lg border border-border px-2 py-1 text-sm hover:bg-surface"
              aria-label="Next match"
            >
              ↓
            </button>
          </div>
        )}
      </div>

      <div
        className="relative rounded-xl border border-border overflow-hidden bg-white"
        style={{ height }}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
            Loading graph…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-danger text-sm px-4 text-center">
            {error}
          </div>
        )}
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />

        {!loading && !error && (
          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button
              onClick={() => zoomBy(ZOOM_STEP)}
              className="h-8 w-8 rounded-lg border border-border bg-white/90 text-lg leading-none shadow-sm hover:bg-surface"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              className="h-8 w-8 rounded-lg border border-border bg-white/90 text-lg leading-none shadow-sm hover:bg-surface"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              onClick={resetView}
              className="h-8 w-8 rounded-lg border border-border bg-white/90 text-xs shadow-sm hover:bg-surface"
              aria-label="Reset view"
              title="Reset view"
            >
              ⟲
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
