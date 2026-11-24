"use client";

import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { arc, arcSubject, frame, labelWidth, refreshLabelMetrics, SUBJECT_FONT, LABELS, layout, polar, pretty, SOURCES, WHOLE } from "./layout";
import type { Destination, Entry, MapData, Source, Tile } from "./layout";
import { RoadmapInspector } from "./roadmap-inspector";
import { RoadmapSidebar } from "./roadmap-sidebar";
import { RoadmapContributors } from "./roadmap-contributors";
import { roadmapCounts, type RoadmapCounts } from "./roadmap-counts";
import styles from "./roadmap.module.css";

type NativeSource = "Physlib" | "PhyslibAlpha";
type Selection = { tile: Tile; source?: NativeSource };

function nativeSource(source?: string | null): NativeSource | undefined {
  return source === "Physlib" || source === "PhyslibAlpha" ? source : undefined;
}
type Index = ReturnType<typeof layout>;
type Paths = Record<string, string>;
type FolderPaths = Record<string, string | string[]>;
type References = { modules: Paths; folders: FolderPaths };
const allSources = new Set<Source>(SOURCES);
const colors: Record<Source, string> = {
  Physlib: "var(--rm-physlib)", PhyslibAlpha: "var(--rm-alpha)", UnformalizedClaims: "var(--rm-todo)",
};

const surfaces: Record<Source, string> = {
  Physlib: "var(--tile-physlib)", PhyslibAlpha: "var(--tile-alpha)", UnformalizedClaims: "var(--tile-todo)",
};

function searchText(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function isArticleHash(hash: string) {
  return /^#(?:file=|verso=|Physlib(?:Alpha)?(?:\/|$)|articles$|dependency-map$)/.test(hash);
}

function fieldOf(entry: Entry) {
  return entry.node.path.split(".", 1)[0];
}

function writeField(url: URL, field: string) {
  if (field) url.searchParams.set("field", field);
  else url.searchParams.delete("field");
}

function targetHash({ tile, source }: Selection) {
  const path = encodeURIComponent(tile.entry.node.path);
  const sourceParam = source && tile.entry.sources.includes("Physlib") && tile.entry.sources.includes("PhyslibAlpha")
    ? "&source=" + source : "";
  return `${tile.entry.kind === "folder" ? "dir" : "f"}=${path}${sourceParam}`;
}

function fromHash(index: Index): Selection | undefined {
  const params = new URLSearchParams(location.hash.slice(1));
  const [type, ...parts] = location.hash.slice(1).split("=");
  let value: string;
  try { value = type === "f" ? params.get("f") ?? "" : decodeURIComponent(parts.join("=")); } catch { return; }
  if (type === "d") {
    const split = value.lastIndexOf("~");
    if (split < 0) return;
    const modulePath = value.slice(0,split);
    const tile = index.tiles.find(t => t.entry.kind === "file" && t.entry.node.path === modulePath) ??
      index.tiles.find(t => t.entry.kind === "file" && t.entry.node.wikiPaths?.includes(modulePath));
    if (tile) return {tile};
  } else if (type === "dir" || type === "f") {
    const matches = index.tiles.filter(t => t.entry.node.path === value);
    const tile = matches.find(t => type === "dir" ? t.entry.kind === "folder" : t.entry.kind !== "folder") ??
      (type === "f" ? index.tiles.find(t => t.entry.kind === "file" && t.entry.node.wikiPaths?.includes(value)) : undefined) ?? matches[0];
    if (tile) {
      const source = nativeSource(params.get("source"));
      return { tile, source: source && tile.entry.kind === "file" && tile.entry.sources.includes(source) ? source : undefined };
    }
  }
}

function readerHref(href: string) {
  return href.replace(/^\/(?:api-tracker(?:\/articles)?|roadmap|wiki)#/, "/api-maps#");
}

function nativeModule(link: Destination) {
  if (link.source !== "Physlib" && link.source !== "PhyslibAlpha") return;
  const pinned = /^https:\/\/github\.com\/leanprover-community\/physlib\/blob\/[0-9a-f]{40}\/((?:PhyslibAlpha|Physlib|QuantumInfo)(?:\/[^?#]+)?)\.lean$/;
  return pinned.exec(link.href)?.[1];
}

function fileDestinations(entry: Entry, references: References): Destination[] {
  const links: Destination[] = [];
  const {node} = entry;
  for (const link of node.moduleLinks ?? []) {
    const module = nativeModule(link);
    if (module) links.push({...link,href:references.modules[module] ?? link.href});
  }
  if (!links.length && entry.kind === "file") {
    for (const source of entry.sources) {
      if (source !== "Physlib" && source !== "PhyslibAlpha") continue;
      for (const path of [node.path,...(node.wikiPaths ?? [])]) {
        const name = path.replaceAll(".","/");
        const module = name === source || name.startsWith("QuantumInfo/") ? name : source + "/" + name;
        if (Object.hasOwn(references.modules,module)) {
          links.push({source,href:references.modules[module]});
          break;
        }
      }
    }
  }
  return [...new Map(links.map(link => [link.source + "|" + link.href,link])).values()];
}

function regionActions(entry: Entry, references: References, visible = allSources, source?: NativeSource) {
  const {node, kind} = entry;
  if (kind === "folder" || kind === "todos") {
    const openClaims = visible.has("UnformalizedClaims") && (kind === "todos" ||
      entry.children.some(child => child.kind === "todos" && child.node.apiMapHref === node.apiMapHref));
    const ownArticle = node.apiMapLinks?.find(link => visible.has(link.source))?.href ??
      (openClaims ? node.apiMapHref : undefined);
    const href = ownArticle && readerHref(ownArticle);
    if (href?.startsWith("/api-maps#")) return [{href,label:"Open API Map →"}];
    const paths = references.folders[node.path];
    const folder = kind === "folder" && (Array.isArray(paths) ? paths : paths ? [paths] : [])
      .find(path => visible.has(path.startsWith("PhyslibAlpha/") || path === "PhyslibAlpha" ? "PhyslibAlpha" : "Physlib"));
    if (folder) return [{href:"/api-maps/new?path=" + encodeURIComponent(folder),label:"Create API Map →"}];
    return [];
  }
  if (kind !== "file") return [];
  const links = fileDestinations(entry,references).filter(link => visible.has(link.source) && (!source || source === link.source));
  const docs = links.find(link => link.source === "Physlib" && link.href.startsWith("/docs/")) ??
    links.find(link => link.href.startsWith("/docs/"));
  if (docs) return [{href:docs.href,label:"Open in Documentation →"}];
  const github = links.find(link => nativeModule(link));
  if (github) return [{href:github.href,label:"View Lean source on GitHub ↗"}];
  return [];
}

const softSurfaces: Record<Source,string> = {
  Physlib: "var(--soft-physlib)", PhyslibAlpha: "var(--soft-alpha)", UnformalizedClaims: surfaces.UnformalizedClaims,
};
// Folders without a visible library take a neutral surface.
const neutralSurface = "var(--soft-neutral)";
function fileSurface(source: Source, documented: Set<Source>) {
  if (source === "PhyslibAlpha") return "var(--file-alpha)";
  return documented.has(source) ? surfaces[source] : softSurfaces[source];
}

function SubjectGaps({ index, visible }: {index: Index; visible: Set<Source>}) {
  const roots = index.tiles.filter(t => t.plotted && index.roots.includes(t.entry));
  const subfields = new Set(index.roots.flatMap(root => root.children.filter(child => child.kind === "folder")));
  return <g pointerEvents="none" aria-hidden="true" stroke="var(--surface)" fill="none">
    {index.tiles.filter(t => t.plotted && subfields.has(t.entry) && t.entry.sources.some(s => visible.has(s))).map(t =>
      <path key={t.entry.node.path} d={arc(t.bounds)} strokeWidth="1.3" vectorEffect="non-scaling-stroke"/>)}
    {roots.length > 1 && roots.map((tile,i) => {
      const previous = roots[(i+roots.length-1)%roots.length];
      if (![tile,previous].some(t => t.entry.sources.some(s => visible.has(s)))) return null;
      const s = tile.bounds, a = polar(s.start,tile.sector.inner), b = polar(s.start,s.outer);
      const narrow = Math.min(s.end-s.start,previous.bounds.end-previous.bounds.start)*s.outer;
      return <path key={tile.entry.node.path} d={`M${a.x},${a.y} L${b.x},${b.y}`}
        strokeWidth={Math.min(3.2,Math.max(.4,narrow*.23))} vectorEffect="non-scaling-stroke" data-subject-gap="true"/>;
    })}
  </g>;
}

function showsOnlyOpenClaims(counts: RoadmapCounts | undefined, visible: Set<Source>) {
  return Boolean(counts?.UnformalizedClaims &&
    !SOURCES.some(source => source !== "UnformalizedClaims" && visible.has(source) && counts[source] > 0));
}

const Sectors = memo(function Sectors({ index, tileIndices, visible, references, counts }: {
  index: Index;
  tileIndices: number[];
  visible: Set<Source>;
  references: References;
  counts: Map<Entry, RoadmapCounts>;
}) {
  return <>{tileIndices.map(i => {
    const t = index.tiles[i];
    const { entry, sector } = t;
    const folder = entry.kind === "folder";
    const mid = (sector.outer + sector.inner) / 2, angle = (sector.start + sector.end)/2;
    const width = (sector.end - sector.start) * mid, height = sector.outer - sector.inner;
    const major = index.roots.includes(entry);
    const fullName = entry.kind === "todos" ? "API Map TODOs" : pretty(entry.node.name);
    const name = major ? arcSubject(entry.node.name,width) : fullName;
    const map = folder ? entry.node.apiMapHref : undefined;
    const weight = major || map ? 720 : 600;
    const labelSize = major ? SUBJECT_FONT : Math.min(12, height*.59, width / (labelWidth(name ?? "",1,weight)*1.05 + 3.2));
    const showLabel = Boolean(name) && folder && labelSize >= 2.1;
    const lower = angle > Math.PI/2 && angle < Math.PI*1.5;
    const labelEnd = Math.min(sector.end,sector.start + Math.PI*2 - 0.0001);
    const a = polar(lower ? labelEnd : sector.start, mid);
    const b = polar(lower ? sector.start : labelEnd, mid);
    const fileLinks = entry.kind === "file" ? fileDestinations(entry,references) : [];
    const documented = new Set(fileLinks.filter(link => link.href.startsWith("/docs/")).map(link => link.source));
    const visibleNative = (["Physlib", "PhyslibAlpha"] as const).find(source => visible.has(source) && entry.sources.includes(source));
    const visibleArticle = entry.node.apiMapLinks?.find(link => visible.has(link.source));
    const bandSource = (!major && visibleArticle?.source) || visibleNative;
    const fill = folder ?
      (bandSource === "Physlib" ? "var(--band-physlib)" : bandSource === "PhyslibAlpha" ? "var(--band-alpha)" : "var(--band-neutral)") : "var(--rm-canvas)";
    const openClaimsOnly = entry.kind === "folder" && showsOnlyOpenClaims(counts.get(entry), visible);
    const shown = (openClaimsOnly || entry.kind === "todos") ? visible.has("UnformalizedClaims")
      : entry.sources.some(source => source !== "UnformalizedClaims" && visible.has(source))
        || (visible.has("UnformalizedClaims") && entry.todoLibraries.length > 0);
    const articleShown = entry.node.apiMapLinks?.some(link => visible.has(link.source)) ||
      (visible.has("UnformalizedClaims") && entry.children.some(child => child.kind === "todos" && child.node.apiMapHref === map));
    const actions = regionActions(entry,references,visible);
    const action = actions.length === 1 ? actions[0] : undefined;
    const splitFile = entry.kind === "file" && t.fields.some(field => field.source === "Physlib") &&
      t.fields.some(field => field.source === "PhyslibAlpha");
    const href = splitFile ? undefined : action?.href;
    const targetTitle = fullName + (entry.kind === "file" ? ".lean" : "") + (action ? " · " + action.label.replace(/ [→↗]$/,"") : "");
    const content = <g key={entry.kind + entry.node.path} role={href ? undefined : !splitFile && actions.length ? "button" : "group"} tabIndex={!href && !splitFile && shown ? 0 : undefined}
      cursor={actions.length ? "pointer" : undefined}
      aria-label={href ? undefined : targetTitle} data-tile={i} data-kind={entry.kind} data-path={entry.node.path} data-count={entry.results} data-weight={entry.weight} data-start={t.bounds.start} data-end={t.bounds.end} visibility={shown ? "visible" : "hidden"}>
      <title>{splitFile ? fullName + ".lean" : targetTitle}</title>
      <path d={arc(sector)} pointerEvents={splitFile ? "none" : undefined} stroke="var(--rm-canvas)" strokeWidth={.55} data-map-folder={map ? entry.node.path : undefined}
        fill={openClaimsOnly ? surfaces.UnformalizedClaims
          : entry.kind === "folder" && (major || !(map && articleShown)) ? (bandSource ? softSurfaces[bandSource] : neutralSurface) : fill}/>
      {t.fields.map(field => {
        const source = nativeSource(field.source);
        const fieldAction = splitFile && source ? regionActions(entry,references,visible,source)[0] : undefined;
        const enabled = visible.has(field.source) && shown;
        const shape = <path key={field.source} d={arc(field.sector)}
          fill={fileSurface(field.source, documented)}
          stroke="var(--rm-canvas)" strokeWidth={.55} data-source-field={field.source}
          opacity={enabled ? 1 : 0} pointerEvents={enabled ? "auto" : "none"}/>;
        return fieldAction && enabled
          ? <a key={field.source} href={fieldAction.href} data-source-field={field.source}
              aria-label={`${fullName}.lean · ${field.source} · ${fieldAction.label.replace(/ [→↗]$/,"")}`}>{shape}</a>
          : shape;
      })}
      {Object.entries(t.glyphs).map(([source, path]) =>
        <path key={source} d={path} pointerEvents="none" opacity={visible.has(source as Source) && shown ? 1 : 0} fillRule="evenodd" data-claim-glyph={source === "UnformalizedClaims" || undefined}
          fill={colors[source as Source]}/>)}
      {showLabel && <>
        <defs><path id={`roadmap-label-${i}`} d={`M${a.x} ${a.y} A${mid} ${mid} 0 ${sector.end-sector.start > Math.PI ? 1 : 0} ${lower ? 0 : 1} ${b.x} ${b.y}`}/></defs>
        <text fontSize={labelSize} dy=".32em" fill="var(--foreground)" fontWeight={weight} pointerEvents="none" data-arc-width={width} data-subject={major ? fullName : undefined}>
          <textPath href={`#roadmap-label-${i}`} startOffset="50%" textAnchor="middle">{name}</textPath>
        </text>
      </>}
    </g>;
    return href ? <a key={entry.kind + entry.node.path} href={href}
      aria-label={targetTitle}>{content}</a> : content;
  })}</>;
});

function AreaWeightInfo() {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const anchor = button.current, popup = tip.current;
    const caption = popup?.offsetParent;
    if (!open || !anchor || !popup || !(caption instanceof HTMLElement)) return;
    const align = () => {
      const bounds = caption.getBoundingClientRect();
      const left = anchor.getBoundingClientRect().left;
      popup.style.left = (left - bounds.left) + "px";
      popup.style.maxWidth = (bounds.right - left) + "px";
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(caption);
    return () => observer.disconnect();
  }, [open]);
  return <span className={styles.weightInfo}
    onPointerEnter={event => { if (event.pointerType === "mouse") setOpen(true); }}
    onPointerLeave={event => { if (event.pointerType === "mouse") setOpen(false); }}
    onBlur={() => setOpen(false)}
    onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}>
    <button ref={button} type="button" aria-label="How area is weighted" aria-expanded={open} aria-describedby={open ? id : undefined}
      onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setOpen(true); }}
      onClick={event => { event.currentTarget.focus({preventScroll:true}); setOpen(true); }}>
      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <circle cx="8" cy="8" r="6.3"/><path d="M8 7v4"/><circle cx="8" cy="4.9" r=".7" fill="currentColor" stroke="none"/>
      </svg>
      Area
    </button>
    {open && <span ref={tip} role="tooltip" id={id} className={styles.weightTip}>
      <strong>Area ∝ declarations + unformalized results</strong>
      Each declaration and each unformalized API Map result has equal weight.
    </span>}
  </span>;
}

const EMPTY_TREE: MapData["tree"] = {name:"Physics",path:"",children:[]};
function InteractiveMap({ data, references }: {data?: MapData; references:References}) {
  const [visible,setVisible] = useState(() => new Set<Source>(SOURCES));
  // The library buttons change visibility within the active layout.
  const index = useMemo(() => {refreshLabelMetrics(); return layout(data?.tree ?? EMPTY_TREE,allSources);}, [data]);
  const fieldTiles = useMemo(() => {
    const groups = new Map<string, number[]>();
    index.tiles.forEach((tile, i) => {
      if (!tile.plotted) return;
      const owner = fieldOf(tile.entry);
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner)!.push(i);
    });
    return [...groups];
  }, [index]);
  const [fieldPath,setFieldPath] = useState("");
  const fields = useMemo(() => index.roots.filter(entry => entry.kind === "folder" && entry.children.length && entry.weight > 0),[index]);
  const field = fields.find(entry => entry.node.path === fieldPath);
  const camera = useMemo(() => {
    const tile = field && index.tiles.find(tile => tile.entry === field && tile.plotted);
    return tile ? frame(tile.bounds) : WHOLE;
  },[field,index]);
  function toggleSource(source: Source) {
    setVisible(previous => {
      const next = new Set(previous);
      if (next.has(source)) next.delete(source); else next.add(source);
      return next;
    });
  }
  const [selection,setSelection] = useState<Selection>();
  const selectedEntry = selection?.tile.entry;
  const [query,setQuery] = useState("");
  const [hover,setHover] = useState<Selection>();
  const [focus,setFocus] = useState<Selection>();
  const cameraMovedUnderPointer = useRef(false);
  const viewer = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusOrigin = useRef<HTMLElement | SVGElement | null>(null);
  const [inspectorHost,setInspectorHost] = useState<HTMLElement | null>(null);
  const [contextHost,setContextHost] = useState<HTMLElement | null>(null);
  const counts = useMemo(() => roadmapCounts(index.roots), [index]);
  const activeSelection = hover ?? focus ?? selection;
  const inspected = activeSelection?.tile.entry;
  const inspectedSource = activeSelection?.source && visible.has(activeSelection.source) ? activeSelection.source : undefined;
  const showingPin = Boolean(selectedEntry && inspected === selectedEntry && activeSelection?.source === selection?.source);
  const examinedCounts = inspected && counts.byEntry.get(inspected);
  const inspectedCounts = examinedCounts && inspectedSource ? {
    Physlib: inspectedSource === "Physlib" ? examinedCounts.Physlib : 0,
    PhyslibAlpha: inspectedSource === "PhyslibAlpha" ? examinedCounts.PhyslibAlpha : 0,
    UnformalizedClaims: 0,
  } : examinedCounts;
  const actions = inspected ? regionActions(inspected,references,visible,inspectedSource) : [];
  useEffect(() => {
    setInspectorHost(viewer.current?.querySelector<HTMLElement>("#roadmap-inspector") ?? null);
    setContextHost(viewer.current?.querySelector<HTMLElement>("#roadmap-context") ?? null);
    return () => clearTimeout(hoverTimer.current);
  }, []);
  function inspectPointer(target?: Selection) {
    clearTimeout(hoverTimer.current);
    if (!selectedEntry && !hover && target) setHover(target);
    else if (hover?.tile !== target?.tile || hover?.source !== target?.source) {
      // A moving pointer crosses many thin regions on the way to the sidebar.
      // Switch only after it settles, and allow time to cross the gutter.
      hoverTimer.current = setTimeout(() => setHover(target),target ? 130 : 600);
    }
  }
  function inspectFocus(target?: Selection) {
    clearTimeout(hoverTimer.current);
    setHover(undefined);
    setFocus(target);
  }
  function tabToContext(event: ReactKeyboardEvent) {
    if (event.key !== "Tab" || event.shiftKey || !focus || hover || !actions.length) return false;
    const link = contextHost?.querySelector<HTMLElement>("[data-context-action]");
    const origin = event.target;
    if (!link || !(origin instanceof SVGElement || origin instanceof HTMLElement)) return false;
    event.preventDefault();
    focusOrigin.current = origin;
    link.focus({preventScroll:true});
    return true;
  }
  const search = useRef<HTMLInputElement>(null);
  const hits = useMemo(() => {
    const q = searchText(query);
    if (!q) return [];
    const searchable = index.tiles.filter(({entry}) => (!field || entry === field || entry.node.path.startsWith(field.node.path + ".")) &&
      entry.kind !== "todos" && regionActions(entry,references,visible).length > 0 &&
      entry.sources.some(source => visible.has(source)));
    const native = searchable.map(tile => {
      const paths = [tile.entry.node.path,...(tile.entry.node.wikiPaths ?? [])];
      const names = paths.flatMap(path => [searchText(path),searchText(path.split(".").map(pretty).join(" "))]);
      return {tile,names};
    });
    const exact = native.filter(({names}) => names.includes(q)).map(({tile}) => tile);
    const others = native.filter(({names}) => !names.includes(q) && names.some(name => name.includes(q))).map(({tile}) => tile);
    return [...exact,...others].slice(0,20);
  },[index,field,query,visible,references]);
  const select = useCallback((target?: Selection, writeHash = true, nextField?: string) => {
    clearTimeout(hoverTimer.current);
    focusOrigin.current = null;
    setSelection(target); setQuery(""); setHover(undefined); setFocus(undefined);
    if (nextField !== undefined) setFieldPath(nextField);
    if (writeHash) {
      const oldURL = location.href;
      const url = new URL(oldURL);
      const closingReader = isArticleHash(location.hash);
      if (nextField !== undefined) writeField(url, nextField);
      url.hash = target ? targetHash(target) : "";
      history.replaceState(null, "", url);
      if (closingReader) window.dispatchEvent(new HashChangeEvent("hashchange",{oldURL,newURL:location.href}));
    }
  },[]);
  const unpin = useCallback(() => {
    const origin = focusOrigin.current;
    select();
    if (origin?.isConnected) origin.focus({preventScroll:true});
  },[select]);
  const zoomField = useCallback((path: string) => {
    select(undefined, true, path);
  },[select]);
  useEffect(() => {
    const restore = () => {
      if (!data) return;
      const url = new URL(location.href);
      const requestedField = url.searchParams.get("field") ?? "";
      if (isArticleHash(location.hash)) {
        setFieldPath(requestedField);
        clearTimeout(hoverTimer.current);
        setHover(undefined); setFocus(undefined); setSelection(undefined);
        return;
      }
      const target = fromHash(index);
      const destinations = target ? regionActions(target.tile.entry,references,allSources,target.source) : [];
      const destination = destinations[0];
      if (target && destination && location.hash.startsWith("#d=")) {
        const bookmark = new URLSearchParams(location.hash.slice(1)).get("d") ?? "";
        const name = bookmark.slice(bookmark.lastIndexOf("~") + 1).replaceAll("___", ".");
        const declaration = target.tile.entry.decls.find(item => item.name === name);
        const docs = declaration && fileDestinations(target.tile.entry, references)
          .find(link => link.source === declaration.source && link.href.startsWith("/docs/"));
        const href = docs && declaration ? docs.href + "#" + encodeURIComponent(declaration.name) : destination.href;
        window.location.replace(href);
        return;
      }
      const preferredField = target && (requestedField || !destination) ? fieldOf(target.tile.entry) : requestedField;
      const restoredField = fields.find(item => item.node.path === preferredField)?.node.path ?? "";
      if (restoredField !== requestedField) {
        writeField(url, restoredField);
        history.replaceState(null, "", url);
      }
      select(destinations.length ? target : undefined, false, restoredField);
    };
    restore();
    window.addEventListener("hashchange",restore);
    window.addEventListener("popstate",restore);
    return () => {
      window.removeEventListener("hashchange",restore);
      window.removeEventListener("popstate",restore);
    };
  },[data,index,select,references,fields]);
  const reset = useCallback(() => {
    setVisible(new Set(SOURCES));
    zoomField("");
  },[zoomField]);
  useEffect(() => {
    const shortcuts = (e: KeyboardEvent) => {
      if (isArticleHash(location.hash) || search.current?.closest("[hidden]")) return;
      if (e.key === "Escape") { unpin(); if (document.activeElement === search.current) search.current?.blur(); }
      else if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault(); search.current?.focus();
      }
    };
    window.addEventListener("keydown",shortcuts);
    window.addEventListener("physlib:reset-roadmap",reset);
    return () => {
      window.removeEventListener("keydown",shortcuts);
      window.removeEventListener("physlib:reset-roadmap",reset);
    };
  },[unpin,reset]);
  function pick(target: EventTarget | null): Selection | undefined {
    const group = target instanceof Element
      ? target.closest("[data-tile]") ?? target.closest("a")?.querySelector("[data-tile]")
      : null;
    if (!group) return;
    const tile = index.tiles[Number(group.getAttribute("data-tile"))];
    if (!tile) return;
    const field = target instanceof Element ? target.closest("[data-source-field]") : null;
    const source = tile.entry.kind === "file" ? nativeSource(field?.getAttribute("data-source-field")) : undefined;
    return { tile, source };
  }
  function pin(target: Selection, keyboard = false) {
    if (!regionActions(target.tile.entry,references,visible,target.source).length) return;
    const origin = document.activeElement;
    const owner = field && fields.find(item => item.node.path === fieldOf(target.tile.entry));
    if (owner && owner !== field) cameraMovedUnderPointer.current = true;
    select(target, true, owner?.node.path);
    if (keyboard && (origin instanceof HTMLElement || origin instanceof SVGElement)) focusOrigin.current = origin;
    requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 1023px)").matches) contextHost?.scrollIntoView({block:"nearest"});
      if (keyboard) {
        const control = contextHost?.querySelector<HTMLElement>("[data-context-action]") ?? contextHost?.querySelector<HTMLElement>("button");
        control?.focus({preventScroll:true});
      }
    });
  }
  function activate(target: Selection) {
    const actions = regionActions(target.tile.entry,references,visible,target.source);
    if (actions.length === 1) window.location.assign(actions[0].href);
  }
  const highlighted = focus ?? selection;
  const highlightedTile = highlighted?.tile;
  const highlightedSector = highlightedTile?.fields.find(field => field.source === highlighted?.source)?.sector ??
    highlightedTile?.sector;
  return <div ref={viewer} className={styles.viewer} aria-busy={!data} data-zoom-field={field?.node.path ?? ""}>
    {inspectorHost && data && createPortal(<RoadmapInspector counts={counts.whole}/>,inspectorHost)}
    {contextHost && createPortal(<>
      {inspected && inspectedCounts &&
        <div className={styles.contextualEntry} data-pinned={showingPin}
          onPointerEnter={() => clearTimeout(hoverTimer.current)}
          onPointerLeave={() => inspectPointer(undefined)}
          onFocus={() => {clearTimeout(hoverTimer.current); setFocus(activeSelection);}}
          onBlur={event => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              if (!selection) focusOrigin.current = null;
              setFocus(undefined);
              if (!event.currentTarget.matches(":hover")) inspectPointer(undefined);
            }
          }}>
          {showingPin && <button className={styles.closeDetails} onClick={unpin} aria-label="Unpin selected Globe item">Unpin</button>}
          <RoadmapInspector entry={inspected} counts={inspectedCounts}/>
          <RoadmapContributors entry={inspected} source={inspectedSource}/>
          {actions.map(action => <a key={action.href} className={styles.contextAction} href={action.href} data-context-action
            onKeyDown={event => {
              const origin = focusOrigin.current;
              if (event.key === "Tab" && event.shiftKey && origin?.isConnected && event.currentTarget === contextHost?.querySelector("[data-context-action]")) {
                event.preventDefault();
                origin.focus({preventScroll:true});
              }
            }}>{action.label}</a>)}
        </div>}
    </>,contextHost)}
    <div className={styles.controls}>
      <button className={styles.resetMap} onClick={reset}>Reset Globe</button>
      <select aria-label="Physlib Globe subject" title="Zoom to a physics field" disabled={!data} value={field?.node.path ?? ""} onChange={e => zoomField(e.target.value)}>
        <option value="">Whole Globe</option>{fields.map(item => <option key={item.node.path} value={item.node.path}>{pretty(item.node.name)}</option>)}</select>
      <div className={styles.filters} aria-label="Physlib Globe sources">{(["Physlib", "PhyslibAlpha", "UnformalizedClaims"] as const).map(s => <button key={s} type="button" aria-pressed={visible.has(s)}
        className={s === "UnformalizedClaims" ? styles.openClaimsFilter : undefined}
        style={s !== "UnformalizedClaims" && visible.has(s) ? {background:surfaces[s], borderColor:colors[s]} : undefined}
        onClick={() => toggleSource(s)}>
        <i aria-hidden="true" style={s !== "UnformalizedClaims" ? {background:colors[s]} : undefined}/>{LABELS[s]}</button>)}</div>
      <div className={styles.search}><input ref={search} type="search" aria-label="Search the Physlib Globe" disabled={!data} value={query} placeholder={field ? "Search This Field…" : "Search the Globe…"}
        onChange={e => setQuery(e.target.value)} onKeyDown={e => {if (e.key === "Enter" && hits[0]) pin({tile:hits[0]},true);}}/>
        {query.trim() && <div className={styles.results} onPointerLeave={() => inspectPointer(undefined)}
          onBlur={event => {if (!contextHost?.contains(event.relatedTarget)) setFocus(undefined);}} onKeyDown={tabToContext}>
          {hits.length ? hits.map(tile => <button key={tile.entry.kind + tile.entry.node.path}
          onPointerEnter={event => {if (event.pointerType !== "touch") inspectPointer({tile});}}
          onFocus={event => {if (event.currentTarget.matches(":focus-visible")) inspectFocus({tile});}}
          onClick={event => pin({tile},event.detail === 0)}>
          <strong>{pretty(tile.entry.node.name)}</strong><small>{tile.entry.node.path}</small>
        </button>) : <span>No matching results</span>}</div>}
      </div>
    </div>
    <div className={styles.body}>
      <div className={styles.plot}>
        <svg data-atlas-plot role="group" aria-label="The Physlib Globe of physics folders, Lean files, and declarations"
          viewBox={`${camera.x-camera.size/2} ${camera.y-camera.size/2} ${camera.size} ${camera.size}`}
          onPointerOver={e => {
            if (e.pointerType !== "touch" && !cameraMovedUnderPointer.current) inspectPointer(pick(e.target));
          }}
          onPointerMove={e => {
            // Changing the SVG viewBox can dispatch pointerover on a different
            // tile while the mouse is still. Keep the pin until the user moves.
            if (cameraMovedUnderPointer.current && (e.movementX || e.movementY)) {
              cameraMovedUnderPointer.current = false;
              if (e.pointerType !== "touch") inspectPointer(pick(e.target));
            }
          }}
          onPointerLeave={() => {cameraMovedUnderPointer.current = false; inspectPointer(undefined);}}
          onFocus={e => {if (e.target instanceof Element && e.target.matches(":focus-visible")) inspectFocus(pick(e.target));}}
          onBlur={event => {if (!contextHost?.contains(event.relatedTarget)) setFocus(undefined);}}
          onKeyDown={e => {
            if (tabToContext(e)) return;
            if ((e.key !== "Enter" && e.key !== " ") || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
            const target = pick(e.target);
            if (target) {e.preventDefault(); pin(target,true);}
          }}
          onClick={e => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            const target = pick(e.target);
            if (target) {e.preventDefault(); if (e.detail < 2) pin(target);}
          }}
          onDoubleClick={e => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
            const target = pick(e.target);
            if (target) {e.preventDefault(); activate(target);}
          }}>
          <g aria-hidden="true" pointerEvents="none" color="var(--rm-physlib)">
            {[{radius:132, angle:-32}, {radius:173, angle:88}, {radius:214, angle:208}].map(({radius, angle}) => (
              <g key={radius} transform={`rotate(${angle})`}>
                <circle r={radius} fill="none" stroke="currentColor" strokeOpacity=".36" strokeWidth="2"/>
                <circle cx={radius} cy="0" r="6.5" fill="currentColor"/>
              </g>
            ))}
          </g>
          <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="var(--foreground)" fontSize="44" className="font-semibold tracking-[-0.04em]" pointerEvents="none" aria-label="Physlib">
            <tspan>Phys</tspan><tspan className="font-mono text-accent/60" fill="currentColor">lib</tspan>
          </text>
          {fieldTiles.map(([owner, tileIndices]) => (
            <g key={owner} data-roadmap-field={owner} className={field && owner !== field.node.path ? styles.otherField : undefined}>
              <Sectors index={index} tileIndices={tileIndices} visible={visible} references={references} counts={counts.byEntry}/>
            </g>
          ))}
          <SubjectGaps index={index} visible={visible}/>
          {highlightedTile?.plotted && highlightedSector &&
            (highlighted?.source ? visible.has(highlighted.source) : highlightedTile.entry.sources.some(source => visible.has(source))) &&
            <path className={styles.tileHighlight} d={arc(highlightedSector)} data-roadmap-highlight={focus ? "keyboard" : "pinned"} data-open-claim={showsOnlyOpenClaims(counts.byEntry.get(highlightedTile.entry), visible) || undefined}
              vectorEffect="non-scaling-stroke" pointerEvents="none" aria-hidden="true"/>}
        </svg>
        {!data && <div role="status" className={styles.loading}>Loading the Globe…</div>}
        {visible.size === 0 && <div className={styles.empty}>Select a source to show it on the Globe.</div>}
      </div>
      <RoadmapSidebar/>
    </div>
    <div className={styles.caption}><span className={styles.legend}><span><i className={styles.asterisk}>✳︎</i> Definition</span><span><i className={styles.solid}/> Lemma or Theorem</span><span><i className={styles.hollow}/> Unformalized</span><AreaWeightInfo/></span>
      <span className={styles.paperView}>formal twin of <a href="https://paperview.org/">PaperView <span aria-hidden="true">↗</span></a></span>
    </div>
  </div>;
}

const EMPTY_PATHS: Paths = {};
type ViewerProps = {referencePaths: Paths; folderPaths?: FolderPaths};

export default function RoadmapViewer({referencePaths,folderPaths = EMPTY_PATHS}: ViewerProps) {
  const [data,setData] = useState<MapData>();
  const [error,setError] = useState(false);
  const references = useMemo(() => ({modules:referencePaths,folders:folderPaths}),[referencePaths,folderPaths]);
  useEffect(() => {
    const controller = new AbortController();
    const loadJson = async (path: string) => {
      const response = await fetch(path,{signal:controller.signal});
      if (!response.ok) throw new Error(String(response.status));
      return response.json();
    };
    Promise.all([
      loadJson("/roadmap-view/roadmap-data.json") as Promise<MapData>,
      document.fonts.ready,
    ]).then(([loaded]) => {
      if (!controller.signal.aborted) setData(loaded);
    }).catch(() => {if (!controller.signal.aborted) setError(true);});
    return () => controller.abort();
  },[]);
  if (error) return <p role="alert">The Physlib Globe could not be loaded. <a href="/api-maps">Browse API Maps →</a></p>;
  return <InteractiveMap data={data} references={references}/>;
}
