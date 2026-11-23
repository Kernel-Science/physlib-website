"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SUBJECT_COLORS } from "@/lib/dependency-graph.mjs";
import { overviewFilename } from "@/lib/dependency-overview.mjs";

type LayoutEngine = {
  layout(dot: string, format: string, engine: string): string;
  dot(dot: string): string;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3: any;
    "@hpcc-js/wasm": {
      Graphviz: { load(): Promise<LayoutEngine> };
    };
  }
}

// Keyed by src, so repeat calls - e.g. React Strict Mode's dev-only
// mount/unmount/remount cycle - await the *same* load rather than each
// racing to check "is a <script> tag already in the DOM", which is true
// well before that tag's own load event has actually fired.
const scriptLoads = new Map<string, Promise<void>>();

const scriptElements = new Map<string, HTMLScriptElement>();

function loadScript(src: string): Promise<void> {
  let promise = scriptLoads.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      // A script inserted from JS is async by default, i.e. runs whenever it
      // arrives. async=false keeps the *download* parallel but makes the
      // browser execute these in insertion order, so the three engine
      // scripts below can all be requested at once.
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => {
        s.remove();
        scriptLoads.delete(src);
        scriptElements.delete(src);
        reject(new Error(`Failed to load ${src}`));
      };
      scriptElements.set(src, s);
      document.head.appendChild(s);
    });
    scriptLoads.set(src, promise);
  }
  return promise;
}

// Order matters: d3-graphviz expects window.d3 to exist when it runs. The
// @hpcc-js/wasm tag is there for d3-graphviz's web worker, which finds this
// <script> by its src and importScripts() it, so dot layout runs off the
// main thread.
const ENGINE_SCRIPTS = [
  "/graph-assets/d3.min.js",
  "/graph-assets/@hpcc-js/wasm-graphviz.umd.js",
  "/graph-assets/d3-graphviz.min.js",
];

let localEngine: Promise<LayoutEngine> | null = null;
function loadLayoutEngine() {
  if (!localEngine) {
    const pending = loadScript(ENGINE_SCRIPTS[1]).then(() => window["@hpcc-js/wasm"].Graphviz.load());
    localEngine = pending;
    pending.catch(() => { if (localEngine === pending) localEngine = null; });
  }
  return localEngine;
}

let enginePromise: Promise<void> | null = null;

/**
 * Start downloading the site's pinned graph engine. Safe to call more than
 * once, and safe to call early - e.g. on
 * mount, while the graph data is still being fetched - so the two downloads
 * overlap instead of running back to back.
 */
export function preloadGraphvizEngine(): Promise<void> {
  if (!enginePromise) {
    const attempt = Promise.all(ENGINE_SCRIPTS.map(loadScript)).then(() => undefined);
    enginePromise = attempt;
    attempt.catch(() => {
      // Forget a failed attempt entirely (including scripts that did load
      // but ran without their dependency), so "Try again" really retries.
      for (const src of ENGINE_SCRIPTS) {
        scriptLoads.delete(src);
        scriptElements.get(src)?.remove();
        scriptElements.delete(src);
      }
      if (enginePromise === attempt) enginePromise = null;
    });
  }
  return enginePromise;
}

function parseOverview(source: string): SVGSVGElement | null {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  const svg = doc.documentElement;
  if (!(svg instanceof SVGSVGElement) || !svg.querySelector("g.graph g.node")) return null;
  return document.importNode(svg, true);
}

async function fetchOverview(dot: string, signal: AbortSignal): Promise<SVGSVGElement | null> {
  try {
    const response = await fetch(`/graph-assets/${overviewFilename(dot)}`, { signal });
    if (!response.ok) return null;
    return parseOverview(await response.text());
  } catch {
    return null;
  }
}

let importGraphPromise: Promise<string> | null = null;

/**
 * The module import graph (public/my_graph.dot), fetched once per page load
 * and shared by every caller.
 */
export function loadImportGraphDot(): Promise<string> {
  if (!importGraphPromise) {
    const attempt = fetch("/my_graph.dot").then((response) => {
      if (!response.ok) throw new Error("Failed to load the import graph");
      return response.text();
    });
    importGraphPromise = attempt;
    attempt.catch(() => {
      if (importGraphPromise === attempt) importGraphPromise = null;
    });
  }
  return importGraphPromise;
}

type NodeEntry = {
  name: string;
  el: SVGGraphicsElement;
  href: string;
};

const MATCH_STROKE = "var(--accent)";
const SELECTED_STROKE = "var(--success, #16a34a)";
const HIGHLIGHT_WIDTH = "3";
const READ_SCALE = 1.4;
const ZOOM_STEP = 1.4;
const ZOOM_EXTENT: [number, number] = [0.001, 12];
// Below this scale node labels are unreadable smudges, so a graph that would
// need to shrink further to fit entirely is fitted by height instead.
const MIN_LEGIBLE_SCALE = 0.15;
// Module labels use 13 graph units. At less than 10 screen pixels, use the
// available space to show the subject colors and the connections between them.
const MODULE_LABEL_SCALE = 10 / 13;
const FIT_PADDING = 0.94;
// Tall enough to be useful, never taller than the viewport, and capped so it
// doesn't swallow a large monitor.
const DEFAULT_HEIGHT = "clamp(22rem, 70vh, 46rem)";

// Graphviz writes black-on-white presentation attributes into its SVG. These
// rules re-colour it from the site's theme tokens instead, so the graph sits
// on the page surface in both light and dark mode. Nodes given an explicit
// fill in the dot source (fill != "none") keep Graphviz's own text colour,
// since that fill was chosen to go with black text.
const GRAPH_CSS = `
.gv-canvas svg { display: block; }
@media (max-width: 640px) {
  .gv-view { --gv-phone-overview-height: max(14rem, 75vw); }
}
.gv-canvas g.graph > polygon { fill: transparent; stroke: none; }
.gv-canvas g.node { cursor: pointer; }
.gv-canvas g.node :is(circle, ellipse, polygon) { stroke: color-mix(in srgb, var(--foreground) 55%, transparent); }
.gv-canvas g.node :is(circle, ellipse, polygon)[fill="none"] ~ text { fill: var(--foreground); }
.gv-canvas g.edge path { stroke: color-mix(in srgb, var(--foreground) 38%, transparent); }
.gv-canvas g.edge polygon {
  fill: color-mix(in srgb, var(--foreground) 38%, transparent);
  stroke: color-mix(in srgb, var(--foreground) 38%, transparent);
}
.gv-canvas { --topic-fill: 65%; }
[data-theme="dark"] .gv-canvas { --topic-fill: 38%; }
${Object.entries(SUBJECT_COLORS).map(([name, color]) => `.gv-canvas .topic-${name} { --topic-color: ${color}; }`).join("\n")}
.gv-canvas g.node.module-subject :is(circle, ellipse, polygon) {
  fill: color-mix(in srgb, var(--topic-color) var(--topic-fill), var(--surface));
  stroke: color-mix(in srgb, var(--topic-color) 68%, var(--foreground));
}
.gv-canvas g.node.module-subject text { fill: var(--foreground); }
.gv-canvas g.edge.umbrella-import { opacity: 0.2; }
.gv-canvas svg.gv-overview-distant { --topic-fill: 86%; }
[data-theme="dark"] .gv-canvas svg.gv-overview-distant { --topic-fill: 72%; }
.gv-overview-distant g.node:not(.subject-aggregate) text { visibility: hidden; }
.gv-overview-distant g.node.module-subject :is(circle, ellipse, polygon) {
  vector-effect: non-scaling-stroke;
  stroke-width: 0.65px;
}
.gv-overview-distant g.edge path {
  vector-effect: non-scaling-stroke;
  stroke: color-mix(in srgb, var(--foreground) 30%, transparent);
  stroke-width: 0.55px;
}
.gv-overview-distant g.node.module-subject circle {
  stroke: var(--topic-color);
  stroke-width: 1.6px;
}
.gv-canvas .gv-overview-distant g.edge.umbrella-import { opacity: 0.07; }
.gv-view { --gv-incoming: #166d92; --gv-outgoing: #a94d1a; }
[data-theme="dark"] .gv-view { --gv-incoming: #77d1ff; --gv-outgoing: #ffab71; }
.gv-canvas .gv-directional g.edge polygon {
  transform: scale(var(--gv-head-scale, 1));
  stroke: none;
  fill: color-mix(in srgb, var(--foreground) 58%, transparent);
}
.gv-canvas .gv-trace g.edge { opacity: 0.13; }
.gv-canvas .gv-trace g.edge.umbrella-import { opacity: 0.025; }
.gv-canvas .gv-trace g.edge.gv-incoming { --gv-line: var(--gv-incoming); opacity: 1; }
.gv-canvas .gv-trace g.edge.gv-outgoing { --gv-line: var(--gv-outgoing); opacity: 1; }
.gv-canvas g.edge:is(.gv-incoming, .gv-outgoing) path {
  stroke: var(--gv-line);
  vector-effect: non-scaling-stroke;
  stroke-width: 1.6px;
}
.gv-canvas g.edge:is(.gv-incoming, .gv-outgoing) polygon {
  fill: var(--gv-line);
  stroke: none;
}
.gv-canvas .gv-directional g.edge:is(.gv-incoming, .gv-outgoing) polygon {
  transform: scale(var(--gv-active-head-scale, 1));
}
`;

function indexModuleEdges(svg: SVGSVGElement, scaleArrows: boolean) {
  type Incident = { edge: SVGGElement; direction: "gv-incoming" | "gv-outgoing" };
  const neighbors = new Map<string, Incident[]>();
  function add(name: string, link: Incident) {
    const edges = neighbors.get(name);
    if (edges) edges.push(link);
    else neighbors.set(name, [link]);
  }
  for (const edge of svg.querySelectorAll<SVGGElement>("g.edge")) {
    const [from, to] = (edge.querySelector(":scope > title")?.textContent ?? "").split("->");
    if (!from || !to) continue;
    add(from, { edge, direction: "gv-outgoing" });
    add(to, { edge, direction: "gv-incoming" });
    if (!scaleArrows) continue;
    // Graphviz draws its shaft to the base of the triangular arrow, whose
    // second point is the tip. Keep the shaft connected at any screen size.
    const polygon = edge.querySelector("polygon");
    const path = edge.querySelector("path");
    if (!polygon || polygon.points.numberOfItems < 3 || !path) continue;
    const tip = polygon.points.getItem(1);
    polygon.style.transformOrigin = `${tip.x}px ${tip.y}px`;
    path.setAttribute("d", `${path.getAttribute("d")} L${tip.x},${tip.y}`);
  }
  let activeName: string | null = null;
  let active: Incident[] = [];
  return (name: string | null) => {
    if (name === activeName) return;
    activeName = name;
    for (const { edge, direction } of active) edge.classList.remove(direction);
    active = name ? neighbors.get(name) ?? [] : [];
    for (const { edge, direction } of active) edge.classList.add(direction);
    svg.classList.toggle("gv-trace", active.length > 0);
  };
}

function setHighlight(el: SVGGraphicsElement, stroke: string | null) {
  const shape = el.querySelector<SVGElement>("circle, ellipse, polygon");
  if (!shape) return;
  // Inline style rather than attributes: GRAPH_CSS styles the stroke, and a
  // stylesheet rule beats a presentation attribute.
  if (stroke) {
    shape.style.stroke = stroke;
    shape.style.strokeWidth = HIGHLIGHT_WIDTH;
  } else {
    shape.style.removeProperty("stroke");
    shape.style.removeProperty("stroke-width");
  }
}

type Stage = "engine" | "layout" | "done";

type Props = {
  /**
   * Produces the dot source to draw. Pass null while the caller doesn't know
   * yet what to draw: the view then shows its loading state at full size (so
   * nothing below it jumps when the graph arrives).
   */
  getDot: (() => Promise<string>) | null;
  overview?: boolean;
  packedLayout?: boolean;
  fitAll?: boolean;
  selectedModule?: string | null;
  onSelectModule?: (name: string) => void;
  onOpenSubject?: (name: string) => void;
  height?: string;
  label?: string;
  /** Shown instead of a blank canvas when the dot source has no nodes. */
  emptyMessage?: string;
};

export function GraphvizView({
  getDot,
  overview = false,
  packedLayout = false,
  fitAll = false,
  selectedModule,
  onSelectModule,
  onOpenSubject,
  height = DEFAULT_HEIGHT,
  label,
  emptyMessage = "No modules match this selection.",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphvizRef = useRef<any>(null);
  const lastFit = useRef<{ k: number; x: number; y: number } | null>(null);
  const nodeIndexRef = useRef<NodeEntry[]>([]);
  const highlightLinks = useRef<((name: string | null) => void) | null>(null);
  const highlightedRef = useRef<SVGGraphicsElement[]>([]);
  const selectedRef = useRef<NodeEntry | null>(null);
  const lastClickedNode = useRef<SVGGraphicsElement | null>(null);
  const requestedModule = useRef(selectedModule);
  // Whether the view has already been moved to the current search's match.
  const jumpedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("engine");
  const [nodeCount, setNodeCount] = useState<number | null>(null);
  const [subjectCount, setSubjectCount] = useState(0);
  const [cropped, setCropped] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loading = stage !== "done";
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<NodeEntry[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<NodeEntry | null>(null);
  const helpId = useId();
  const directional = overview || !!onSelectModule || !!onOpenSubject;
  const packed = overview || packedLayout;

  useEffect(() => {
    requestedModule.current = selectedModule;
    if (selectedModule !== undefined) {
      const entry = nodeIndexRef.current.find((node) => node.name === selectedModule);
      setSelected(entry ?? null);
    }
  }, [selectedModule]);

  useEffect(() => {
    selectedRef.current = selected;
    highlightLinks.current?.(selected?.name ?? null);
  }, [selected]);

  const selectModule = useCallback((entry: NodeEntry | null) => {
    setSelected(entry);
    if (entry) onSelectModule?.(entry.name);
  }, [onSelectModule]);

  // Keep the DOM highlight in sync with React state: matches get a blue
  // outline, the selected node (from either search or a click) gets green
  // and wins if it's also a match.
  useEffect(() => {
    for (const el of highlightedRef.current) setHighlight(el, null);
    const styled: SVGGraphicsElement[] = [];
    for (const m of matches) {
      if (selected && m.el === selected.el) continue;
      setHighlight(m.el, MATCH_STROKE);
      styled.push(m.el);
    }
    if (selected) {
      setHighlight(selected.el, SELECTED_STROKE);
      styled.push(selected.el);
    }
    highlightedRef.current = styled;
  }, [matches, selected]);

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

  const runSearch = useCallback((raw: string) => {
    jumpedRef.current = false;
    const q = raw.trim().toLowerCase();
    setSearched(q.length > 0);
    if (!q) {
      setMatches([]);
      setMatchIndex(0);
      return;
    }
    const found = nodeIndexRef.current.filter((n) =>
      n.name.toLowerCase().includes(q),
    );
    setMatches(found);
    setMatchIndex(0);
    // Select the first hit so there's always a clear "current" match, but
    // don't move the view until the user explicitly asks to (Enter).
    // With no hit, clear the selection so Enter cannot jump to a stale node.
    setSelected(found[0] ?? null);
  }, []);

  const goToMatch = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
      const next = (matchIndex + delta + matches.length) % matches.length;
      setMatchIndex(next);
      selectModule(matches[next]);
      jumpToEntry(matches[next]);
      jumpedRef.current = true;
    },
    [matches, matchIndex, jumpToEntry, selectModule],
  );

  const zoomBy = useCallback((factor: number) => {
    const gv = graphvizRef.current;
    const zoomBehavior = gv?.zoomBehavior();
    const zoomSelection = gv?.zoomSelection();
    if (!zoomBehavior || !zoomSelection || !containerRef.current) return;
    const point: [number, number] = [
      containerRef.current.clientWidth / 2,
      containerRef.current.clientHeight / 2,
    ];
    zoomBehavior.scaleBy(zoomSelection, factor, point);
  }, []);

  // Clicking a graph node is a two-step confirm: the first click just
  // selects it (green highlight + info panel below the search box) without
  // navigating, so panning/exploring the graph can't accidentally send you
  // to GitHub. Clicking the *same*, already-selected node again opens it.
  // Delegate events because the SVG nodes are inserted after React mounts.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: MouseEvent) {
      const target = e.target as Element | null;
      // Some Graphviz layouts put the visible label beside the link.
      let nodeG = target?.closest("g.node") ?? null;
      // On a phone the fitted circles can be only a few pixels across. If a
      // tap lands just outside them, choose the nearest center within 9 px.
      const svg = target?.closest("svg");
      if (!nodeG && svg && e.detail > 0 && window.matchMedia("(pointer: coarse)").matches) {
        const graph = svg.querySelector("g.graph");
        const [x, y] = window.d3.pointer(e, graph);
        let nearest = 9 / window.d3.zoomTransform(svg).k;
        for (const glyph of svg.querySelectorAll<SVGCircleElement | SVGEllipseElement>("g.node circle, g.node ellipse")) {
          const distance = Math.hypot(glyph.cx.baseVal.value - x, glyph.cy.baseVal.value - y);
          if (distance < nearest) {
            nearest = distance;
            nodeG = glyph.closest("g.node");
          }
        }
      }
      if (!nodeG || !container!.contains(nodeG)) return;
      const subject = nodeG.getAttribute("data-subject");
      if (subject) {
        e.preventDefault();
        onOpenSubject?.(subject);
        return;
      }
      const entry = nodeIndexRef.current.find((n) => n.el === nodeG);
      if (!entry) return;
      e.preventDefault();
      if (lastClickedNode.current === entry.el && selectedRef.current?.el === entry.el && entry.href) {
        window.open(entry.href, "_blank", "noopener,noreferrer");
      } else {
        lastClickedNode.current = entry.el;
        selectModule(entry);
      }
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key !== " " && e.key !== "Enter") return;
      const subject = (e.target as Element | null)?.closest("g.node")?.getAttribute("data-subject");
      if (!subject) return;
      e.preventDefault();
      onOpenSubject?.(subject);
    }
    container.addEventListener("click", handleClick);
    container.addEventListener("keydown", handleKey);
    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("keydown", handleKey);
    };
  }, [onOpenSubject, selectModule]);

  // The library overview always fits in the panel. For focused graphs,
  // prioritize readable labels and flag any cropping in the controls.
  const fitTransform = useCallback(() => {
    const container = containerRef.current;
    const graphG = container?.querySelector<SVGGraphicsElement>("svg g");
    if (!container || !graphG || !window.d3) return null;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return null;
    const bbox = graphG.getBBox();
    const widthFit = (cw / (bbox.width || 1)) * FIT_PADDING;
    const heightFit = (ch / (bbox.height || 1)) * FIT_PADDING;
    const contain = Math.min(widthFit, heightFit);
    const wanted = overview || fitAll || contain >= MIN_LEGIBLE_SCALE ? contain : heightFit;
    const scale = Math.min(READ_SCALE, Math.max(ZOOM_EXTENT[0], wanted));
    setCropped(bbox.width * scale > cw + 1 || bbox.height * scale > ch + 1);
    return window.d3.zoomIdentity
      .translate(cw / 2, ch / 2)
      .scale(scale)
      .translate(-(bbox.x + bbox.width / 2), -(bbox.y + bbox.height / 2));
  }, [overview, fitAll]);

  const resetView = useCallback(() => {
    const gv = graphvizRef.current;
    const zoomBehavior = gv?.zoomBehavior();
    const zoomSelection = gv?.zoomSelection();
    // Recomputed rather than replayed, so it is still a fit if the window
    // has been resized since the graph was drawn.
    const transform = fitTransform();
    if (!zoomBehavior || !zoomSelection || !transform) return;
    lastFit.current = transform;
    zoomBehavior.transform(zoomSelection, transform);
  }, [fitTransform]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    setError(null);
    setStage("engine");
    setNodeCount(null);
    setSubjectCount(0);
    setCropped(false);
    setSelected(null);
    setMatches([]);
    setMatchIndex(0);
    setQuery("");
    setSearched(false);

    const controller = new AbortController();
    let observer: ResizeObserver | undefined;

    function prepareSvg(svg: SVGSVGElement) {
      if (label) svg.setAttribute("aria-label", label);
      // Pan and zoom use panel pixels on both the precomputed and live layouts.
      svg.removeAttribute("viewBox");
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");

      const entries: NodeEntry[] = [];
      let collapsed = 0;
      for (const node of svg.querySelectorAll<SVGGraphicsElement>("g.node")) {
        const name = node.querySelector(":scope > title")?.textContent;
        if (!name) continue;
        const link = node.querySelector("a");
        if (name.startsWith("subject:")) {
          collapsed++;
          const subject = name.slice("subject:".length);
          node.setAttribute("data-subject", subject);
          link?.setAttribute("role", "button");
          link?.setAttribute("tabindex", "0");
          link?.setAttribute("aria-label", `Expand ${subject.replace(/([a-z])([A-Z])/g, "$1 $2")} modules`);
          continue;
        }
        const href = link?.getAttribute("xlink:href") ?? link?.getAttribute("href") ?? "";
        entries.push({ name, el: node, href });
      }
      nodeIndexRef.current = entries;
      setSubjectCount(collapsed);
      setNodeCount(entries.length);
      if (requestedModule.current) {
        setSelected(entries.find((entry) => entry.name === requestedModule.current) ?? null);
      }
      const gv = graphvizRef.current;
      if (directional) {
        const highlight = indexModuleEdges(svg, packed);
        highlightLinks.current = highlight;
        const trace = (target: EventTarget | null) => {
          const name = target instanceof Element && svg.contains(target)
            ? target.closest("g.node")?.querySelector(":scope > title")?.textContent : null;
          highlight(name ?? selectedRef.current?.name ?? null);
        };
        svg.addEventListener("pointerover", (event) => trace(event.target));
        svg.addEventListener("pointerleave", () => trace(null));
        svg.addEventListener("focusin", (event) => trace(event.target));
        svg.addEventListener("focusout", (event) => trace(event.relatedTarget));
      }
      if (packed) {
        svg.classList.add("gv-directional");
        let lastScale = 0;
        gv.zoomBehavior().on("zoom.presentation", (event: { transform: { k: number } }) => {
          const scale = event.transform.k;
          if (scale === lastScale) return;
          lastScale = scale;
          svg.classList.toggle("gv-overview-distant", overview && scale < MODULE_LABEL_SCALE);
          // The DOT specifies arrowsize=0.7 (seven graph units long).
          svg.style.setProperty("--gv-head-scale", String(3 / (7 * scale)));
          svg.style.setProperty("--gv-active-head-scale", String(7 / (7 * scale)));
        });
      }
      resetView();
      if (container) {
        observer?.disconnect();
        observer = new ResizeObserver(() => {
          // D3 stores the exact last applied transform on the zoom selection.
          // Any pan, pinch, search jump, or zoom button replaces that object.
          const current = window.d3.zoomTransform(gv.zoomSelection().node());
          if (!lastFit.current || current === lastFit.current) resetView();
        });
        observer.observe(container);
      }
      setStage("done");
    }

    async function run() {
      if (!getDot || !container) return;
      try {
        const data = getDot();
        const [dot, cachedSvg] = await Promise.all([
          data,
          overview ? data.then((dot) => fetchOverview(dot, controller.signal)) : null,
          packed ? loadScript(ENGINE_SCRIPTS[0]) : preloadGraphvizEngine(),
        ]);
        if (cancelled) return;
        const count = (dot.match(/^\s*"[^"]+"\s*\[/gm) ?? []).length;
        setNodeCount(count);
        if (count === 0) {
          setStage("done");
          return;
        }

        if (packed) {
          let svg = cachedSvg;
          if (!svg) {
            setStage("layout");
            const [{ layoutOverview }, engine] = await Promise.all([
              import("@/lib/dependency-layout.mjs"), loadLayoutEngine(),
            ]);
            if (cancelled) return;
            svg = parseOverview(layoutOverview(engine, dot));
            if (!svg) throw new Error("Invalid dependency overview");
          }
          container.replaceChildren(svg);
          const selection = window.d3.select(svg);
          const graph = selection.select("g.graph");
          const zoom = window.d3.zoom().scaleExtent(ZOOM_EXTENT)
            .on("zoom", (event: { transform: { toString(): string } }) => {
              graph.attr("transform", event.transform.toString());
            });
          selection.call(zoom);
          graphvizRef.current = {
            zoomBehavior: () => zoom,
            zoomSelection: () => selection,
            destroy: () => selection.on(".zoom", null),
          };
          prepareSvg(svg);
          return;
        }

        setStage("layout");
        const gv = window.d3.select(container).graphviz()
          .zoom(true)
          .zoomScaleExtent(ZOOM_EXTENT)
          .engine("dot");
        graphvizRef.current = gv;
        gv.onerror((message: unknown) => {
          if (cancelled) return;
          console.error(message);
          setError("The graph could not be laid out.");
          setStage("done");
        });
        gv.on("end", () => {
          const svg = container.querySelector("svg");
          if (!cancelled && svg) prepareSvg(svg);
        });
        gv.renderDot(dot);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("The graph could not be loaded.");
          setStage("done");
        }
      }
    }

    run();
    return () => {
      cancelled = true;
      controller.abort();
      observer?.disconnect();
      highlightLinks.current = null;
      lastClickedNode.current = null;
      lastFit.current = null;
      // Each d3-graphviz instance owns a web worker holding its own copy of
      // the Graphviz wasm; without this every re-render of the graph (and
      // every visit to the page) would leave one running.
      try {
        graphvizRef.current?.destroy();
      } catch {
        // already torn down
      }
      graphvizRef.current = null;
      nodeIndexRef.current = [];
      highlightedRef.current = [];
      container?.replaceChildren();
    };
  }, [getDot, overview, packed, directional, label, attempt, resetView]);

  const controlClass =
    "h-8 w-8 rounded-(--radius) border border-border bg-background/90 text-foreground shadow-sm hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-accent";
  const showGraph = !loading && !error && nodeCount !== 0;

  return (
    <div className="gv-view flex flex-col gap-2">
      <style>{GRAPH_CSS}</style>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            // First Enter shows the current match; after that Enter and
            // Shift+Enter step through the rest.
            if (!jumpedRef.current) {
              if (selected) {
                selectModule(selected);
                jumpToEntry(selected);
              }
              jumpedRef.current = true;
            } else if (matches.length > 1) {
              goToMatch(e.shiftKey ? -1 : 1);
            } else if (selected) {
              selectModule(selected);
              jumpToEntry(selected);
            }
          }}
          placeholder="Search for a module…"
          aria-label="Search for a module"
          aria-describedby={helpId}
          disabled={!showGraph}
          className="site-field flex-1 disabled:opacity-60"
        />
        {searched && (
          <span role="status" className="text-xs text-muted whitespace-nowrap tabular-nums">
            {matches.length === 0
              ? "No matches"
              : `${matchIndex + 1} / ${matches.length}`}
          </span>
        )}
        {matches.length > 1 && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => goToMatch(-1)}
              className="rounded-(--radius) border border-border px-2 py-1 text-sm hover:bg-surface"
              aria-label="Previous match"
              title="Previous match (Shift+Enter)"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => goToMatch(1)}
              className="rounded-(--radius) border border-border px-2 py-1 text-sm hover:bg-surface"
              aria-label="Next match"
              title="Next match (Enter)"
            >
              ↓
            </button>
          </div>
        )}
      </div>

      {selected && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: SELECTED_STROKE }}
            aria-hidden
          />
          <span className="min-w-0 font-mono text-xs text-foreground/90 break-all">
            {selected.name}
          </span>
          <span className="ml-auto flex items-center gap-3 whitespace-nowrap">
            <button
              type="button"
              onClick={() => jumpToEntry(selected)}
              className="text-accent hover:underline"
            >
              Center
            </button>
            {selected.href && (
              <a
                href={selected.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                View on GitHub ↗
              </a>
            )}
          </span>
        </div>
      )}

      {showGraph && directional && (
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="text-foreground">Prerequisite → importing module</span>
          <span><span aria-hidden style={{ color: "var(--gv-incoming)" }}>━━▶ </span>Imports of selected module</span>
          <span><span aria-hidden style={{ color: "var(--gv-outgoing)" }}>━━▶ </span>Modules that import it</span>
        </p>
      )}
      <div
        className="gv-canvas relative rounded-xl border border-border overflow-hidden bg-surface"
        style={{ height, maxHeight: overview ? "var(--gv-phone-overview-height, none)" : undefined }}
        aria-busy={loading}
      >
        {loading && !error && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-sm text-muted"
          >
            <span
              aria-hidden
              className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent motion-reduce:animate-none"
            />
            <span>
              {stage === "engine"
                ? "Loading graph…"
                : `Laying out ${nodeCount ?? ""} ${nodeCount === 1 ? "module" : "modules"}…`}
            </span>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center text-sm"
          >
            <span className="text-danger">{error}</span>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="rounded-(--radius) border border-border bg-background px-3 py-1.5 text-sm hover:bg-surface-secondary"
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && nodeCount === 0 && (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-muted"
          >
            {emptyMessage}
          </div>
        )}
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />

        {showGraph && (
          <div className="absolute bottom-3 right-3 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => zoomBy(ZOOM_STEP)}
              className={`${controlClass} text-lg leading-none`}
              aria-label="Zoom in"
              title="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              className={`${controlClass} text-lg leading-none`}
              aria-label="Zoom out"
              title="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetView}
              className={`${controlClass} text-xs`}
              aria-label="Reset view"
              title="Reset view"
            >
              ⟲
            </button>
          </div>
        )}
      </div>

      {showGraph && (
        <p id={helpId} className="text-xs text-muted">
          {nodeCount} {subjectCount > 0 && "individual "}{nodeCount === 1 ? "module" : "modules"}
          {subjectCount > 0 && ` · ${subjectCount} grouped ${subjectCount === 1 ? "subject" : "subjects"}`}
          {cropped
            ? ", not all in view. Drag to pan, scroll to zoom."
            : ". Drag to pan, scroll to zoom."}{" "}
          {directional ? "Hover or select a module to trace its imports. Press Enter to zoom to a search result." : "Click a module to select it."}
        </p>
      )}
    </div>
  );
}
