import { sourceDeclaration } from "./external-declarations";
import type { ExternalIndex, ExternalGroup } from "./external-declarations";

export const SOURCES = ["Physlib", "PhyslibAlpha", "External", "UnformalizedClaims"] as const;
export type Source = (typeof SOURCES)[number];
export const LABELS: Record<Source, string> = {
  Physlib: "Physlib", PhyslibAlpha: "PhyslibAlpha", External: "External", UnformalizedClaims: "Unformalized",
};

export type Destination = { source: Source; href: string; label?: string };
export type Declaration = {
  name: string; source: Source; kind: string; href?: string; statement?: string;
  project?: string; library?: "Physlib" | "PhyslibAlpha"; sourceKind?: string; line?: number; status?: string; filePath?: string; srcs?: { title?: string; url?: string; arxiv?: string }[];
};
export type ExternalProject = { repository: string; href: string; fileCount: number; modulesHref: string };
export type TreeNode = {
  name: string; path: string; children?: TreeNode[]; decls?: Declaration[];
  sources?: Source[]; moduleLinks?: Destination[]; wikiPaths?: string[]; project?: string;
  apiMapLinks?: Destination[]; apiMapHref?: string; todoGroup?: boolean; externalProject?: ExternalProject; externalIndex?: ExternalIndex; externalGroup?: ExternalGroup;
};
export type MapData = { tree: TreeNode };
export type Entry = {
  node: TreeNode; kind: "folder" | "file" | "todos" | "project"; children: Entry[];
  decls: Declaration[]; results: number; weight: number; external: boolean; mapped: boolean; projects: number; repositories: string[]; todoLibraries: Source[]; sources: Source[];
};
export type Sector = { start: number; end: number; inner: number; outer: number };
export type Dot = { x: number; y: number; radius: number; decl: Declaration };
export type Tile = { plotted: boolean; entry: Entry; sector: Sector; labelSector?: Sector; bounds: Sector; color: string; fields: { source: Source; sector: Sector }[]; dots: Dot[]; glyphs: Partial<Record<Source, string>> };

export const pretty = (s: string) => s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ (?:(And|Of|In|For|With|Or|the))(?= )/g, word => word.toLowerCase());
export const SUBJECT_FONT = 18;
const subjectNames: Record<string,string[]> = {
  ClassicalFieldTheory: ["Classical Fields","Class. Fields"], ClassicalMechanics: ["Classical Mechanics","CM"],
  CondensedMatter: ["Condensed Matter","Cond. Matter","CMT"], Cosmology: ["Cosmology","Cosmo"], Electromagnetism: ["Electromagnetism","EM"],
  FluidDynamics: ["Fluid Dynamics","Fluids"], LatticeQFT: ["Lattice QFT","Latt. QFT"], Mathematics: ["Mathematics","Math"],
  QFT: ["Quantum Field Theory","QFT"], QuantumInfo: ["QI"], QuantumMechanics: ["Quantum Mechanics","QM"], Relativity: ["Relativity"],
  SpaceAndTime: ["Spacetime","Space"], StatisticalMechanics: ["Statistical Mechanics","Stat Mech","Stat"], StringTheory: ["String Theory","Strings"],
  Thermodynamics: ["Thermodynamics","Thermo"],
};
export const subjectLabels = (name: string) => subjectNames[name] ?? [pretty(name)];
let labelContext: CanvasRenderingContext2D | null;
const measured = new Map<string,number>();
let labelFamily = "";
export function refreshLabelMetrics() {
  if (typeof document === "undefined") return;
  labelContext ??= document.createElement("canvas").getContext("2d");
  labelFamily = getComputedStyle(document.body).fontFamily;
  measured.clear();
}
export function labelWidth(text: string, size: number, weight: number) {
  if (!labelContext) return text.length * size * .58;
  const key = weight + " " + text;
  let width = measured.get(key);
  if (width === undefined) {
    labelContext.font = weight + " 100px " + labelFamily;
    width = labelContext.measureText(text).width / 100;
    measured.set(key,width);
  }
  return width * size;
}
const subjectWidth = (label: string) => labelWidth(label,SUBJECT_FONT,720) + SUBJECT_FONT * 1.2;
export function arcSubject(name: string, width: number) {
  return subjectLabels(name).find(label => subjectWidth(label) <= width);
}
const TAU = 2 * Math.PI;
export function declarationVisible(d: Declaration, visible: Set<Source>) {
  return visible.has(d.source) && (d.source !== "UnformalizedClaims" || visible.has(d.library ?? "Physlib"));
}

export type ContributorCounts = Record<string, { count: number; logins?: string[] }>;
export const CONTRIBUTOR_EXPONENT = 1.1;
const PHYS_REPO = "leanprover-community/physlib";
function contributions(group: ExternalGroup) {
  return Object.entries(group.byProject ?? (group.project ? {[group.project]:group.count} : {}));
}

function contributorRates(tree: TreeNode, contributors: ContributorCounts) {
  const totals = new Map<string,number>();
  let nativeTodos = 0;
  function add(repo: string, n: number) {
    const key = repo.toLowerCase();
    totals.set(key,(totals.get(key) ?? 0)+n);
  }
  function collect(node: TreeNode) {
    for (const row of node.decls ?? []) {
      if (row.source === "UnformalizedClaims") nativeTodos++;
      else add(row.source === "External" ? row.project ?? "" : PHYS_REPO,1);
    }
    for (const group of node.externalIndex?.groups ?? []) {
      for (const [repo,count] of contributions(group)) add(repo,count);
    }
    node.children?.forEach(collect);
  }
  collect(tree);
  const rates = new Map<string,number>();
  const missing: string[] = [];
  const counts = new Map(Object.entries(contributors).map(([repo,record]) => [repo.toLowerCase(),record.count]));
  for (const [repo,total] of totals) {
    const count = counts.get(repo);
    if (typeof count !== "number" || !Number.isFinite(count) || count < 0) missing.push(repo);
    else if (total) {
      const positions = total + (repo === PHYS_REPO ? nativeTodos : 0);
      const repositoryWeight = total * count ** CONTRIBUTOR_EXPONENT;
      rates.set(repo, repositoryWeight / positions);
    }
  }
  return {rates,missing};
}

function entries(node: TreeNode, visible: Set<Source>, hasAudit: boolean, rates?: Map<string,number>): Entry[] {
  const legacyCatalogue = node.path.endsWith(".ExternalProjects") && node.name === "External projects";
  if (legacyCatalogue && hasAudit) return [];
  const children = (node.children ?? []).flatMap(child => entries(child, visible, hasAudit, rates));
  // Old snapshots put repository inventories inside a synthetic directory.
  // Retain their bookmarked paths, but attach them directly to their physics subject.
  if (legacyCatalogue) return children;
  if (visible.has("External")) {
    for (const group of node.externalIndex?.groups ?? []) {
      if (!group.count) continue;
      // Secondary contributions belong directly to this physics topic. The
      // private key locates a chart patch and is never exposed as a folder.
      const repository = group.inline ? undefined : group.project;
      const path = group.inline ? node.path + ".~declarations" : node.path + "." + (repository ?? group.label ?? "").replaceAll(".", "%2E");
      const samples = (group.samples ?? []).map(sample => sourceDeclaration(sample, sample.project ?? repository ?? "", sample.path));
      children.push({
        node: { name: group.inline ? node.name : group.label ?? repository ?? node.name, path, externalGroup: group, project: repository },
        kind: "project", children: [], decls: samples,
        results: group.count, weight: rates ? contributions(group).reduce((sum,[repo,count]) => sum+count*(rates.get(repo.toLowerCase()) ?? 0),0) : group.count, external: true, mapped: false, projects: repository ? 1 : 0,
        repositories: repository ? [repository] : [], todoLibraries: [], sources: ["External"],
      });
    }
  }
  const decls = (node.decls ?? []).filter(d => declarationVisible(d,visible));
  const moduleLinks = node.moduleLinks?.filter(link => visible.has(link.source));
  const file: Entry[] = decls.length || moduleLinks?.length ? [{
    node: { ...node, moduleLinks, externalProject: undefined }, kind: node.todoGroup ? "todos" : "file", children: [], decls,
    results: decls.length, weight: rates ? decls.reduce((sum,d) =>
      sum+(rates.get(d.source === "External" ? (d.project ?? "").toLowerCase() : PHYS_REPO) ?? 0),0) : decls.length, mapped: false, projects: 0, repositories: [],
    todoLibraries: [...new Set(decls.filter(d => d.source === "UnformalizedClaims").map(d => d.library ?? "Physlib"))],
    sources: Array.from(new Set([...decls.map(d => d.source), ...(moduleLinks ?? []).map(link => link.source)])),
    external: decls.length ? decls.every(d => d.source === "External") : Boolean(moduleLinks?.every(link => link.source === "External")),
  }] : [];
  // A visible TODO also keeps its own source article within reach when that
  // library's declaration markers are switched off.
  const todoMaps = new Set(children.filter(item => item.kind === "todos").map(item => item.node.apiMapHref));
  const maps = node.apiMapLinks?.filter(link => visible.has(link.source) || todoMaps.has(link.href));
  const article = maps?.[0]?.href;
  const project = visible.has("External") ? node.externalProject : undefined;
  if (!project && !children.length && !article) return file;
  const members = [...file, ...children];
  const repositories = [...new Set([...members.flatMap(item => item.repositories), ...(project ? [project.repository] : [])])];
  return [{
    node: { ...node, apiMapLinks: maps, apiMapHref: article, externalProject: project },
    kind: project ? "project" : "folder", children: members, decls: [],
    sources: Array.from(new Set([...(maps ?? []).map(link => link.source), ...members.flatMap(item => item.sources), ...(project ? ["External" as const] : [])])),
    projects: repositories.length, repositories,
    todoLibraries: [...new Set(members.flatMap(item => item.todoLibraries))],
    results: members.reduce((n, item) => n + item.results, 0),
    weight: members.reduce((n,item) => n+item.weight,0),
    mapped: Boolean(article) || members.some(item => item.mapped),
    external: Boolean(project) || (members.length > 0 && members.every(item => item.external) && !article),
  }];
}

export function polar(angle: number, radius: number) {
  return { x: Math.sin(angle) * radius, y: -Math.cos(angle) * radius };
}

export function arc(sector: Sector) {
  const { start, end, inner, outer } = sector;
  const a = polar(start, outer), b = polar(end, outer), c = polar(end, inner), d = polar(start, inner);
  if (end - start >= TAU - 1e-9) {
    const far = polar(start + Math.PI,outer), near = polar(start + Math.PI,inner);
    return `M${a.x} ${a.y}A${outer} ${outer} 0 1 1 ${far.x} ${far.y}A${outer} ${outer} 0 1 1 ${a.x} ${a.y}ZM${d.x} ${d.y}A${inner} ${inner} 0 1 0 ${near.x} ${near.y}A${inner} ${inner} 0 1 0 ${d.x} ${d.y}Z`;
  }
  const large = end - start > Math.PI ? 1 : 0;
  return `M${a.x} ${a.y}A${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y}L${c.x} ${c.y}A${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y}Z`;
}

function inset(s: Sector, gap: number): Sector {
  const radial = Math.min(gap, (s.outer - s.inner) * .08);
  const angular = Math.min(gap / s.outer, (s.end - s.start) * .08);
  return { start: s.start + angular, end: s.end - angular, inner: s.inner + radial, outer: s.outer - radial };
}

export function pointGlyph(dot: Dot) {
  const { x, y, radius: r, decl } = dot;
  if (decl.kind === "def" && decl.source !== "UnformalizedClaims") {
    // Four crossing strokes, drawn with a shared outline so the centre stays solid.
    let mark = "";
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8;
      const radius = i % 2 ? r * .38 : r * 1.28;
      // Give each spoke a flat, visible tip at overview scale.
      const spread = i % 2 ? 0 : .15;
      for (const offset of spread ? [-spread, spread] : [0]) {
        const p = polar(angle + offset, radius);
        mark += `${mark ? "L" : "M"}${(x+p.x).toFixed(2)} ${(y+p.y).toFixed(2)}`;
      }
    }
    return mark + "Z";
  }
  const circle = (radius: number) => {
    const diameter = (2 * radius).toFixed(3);
    return `M${(x-radius).toFixed(3)} ${y.toFixed(3)}a${radius} ${radius} 0 1 0 ${diameter} 0a${radius} ${radius} 0 1 0 -${diameter} 0Z`;
  };
  // Even-odd fill cuts out the centre in both themes without painting over the tile.
  return decl.source === "UnformalizedClaims" ? circle(r * 1.16) + circle(r * .65) : circle(r);
}

export function dotGrid(decls: Declaration[], s: Sector) {
  if (!decls.length) return [];
  const height = s.outer - s.inner, width = (s.end - s.start) * (s.inner + s.outer) / 2;
  const rows = Math.max(1, Math.min(decls.length, Math.round(Math.sqrt(decls.length * height / width))));
  const dots: Dot[] = [];
  for (let row = 0; row < rows; row++) {
    const start = Math.floor(row * decls.length / rows);
    const end = Math.floor((row + 1) * decls.length / rows);
    const columns = end - start;
    const ring = s.inner + (row + .5) / rows * height;
    const radius = Number(Math.min(4.8, height / rows / 3.2, (s.end - s.start) * ring / columns / 3.2).toFixed(3));
    for (let index = start; index < end; index++) {
      const angle = s.start + (index - start + .5) / columns * (s.end - s.start);
      dots.push({ ...polar(angle,ring), radius, decl: decls[index] });
    }
  }
  return dots;
}

export function layout(tree: TreeNode, visible: Set<Source>, contributors?: ContributorCounts) {
  const hasIndex = (node: TreeNode): boolean => Boolean(node.externalIndex) || Boolean(node.children?.some(hasIndex));
  const hasAudit = hasIndex(tree);
  const coverage = contributors ? contributorRates(tree,contributors) : undefined;
  const allRoots = (tree.children ?? []).flatMap(n => entries(n, visible, hasAudit,coverage?.rates));
  const hasArea = (entry: Entry) => entry.weight > 0;
  const roots = allRoots.filter(entry => entry.results > 0 || entry.mapped || entry.projects > 0);
  const drawnRoots = roots.filter(hasArea);
  const tiles: Tile[] = [];
  // Import-only files remain searchable and can be opened from their folder. Their
  // parent bounds provide a useful zoom target without taking space in the chart.
  function indexOnly(entry: Entry, bounds: Sector) {
    tiles.push({ plotted: false, entry, sector: bounds, bounds, color: "", fields: [], dots: [], glyphs: {} });
    entry.children.forEach(child => indexOnly(child, bounds));
  }
  function place(entry: Entry, bounds: Sector, depth: number) {
    const region = bounds;
    const isFolder = entry.kind === "folder" || entry.kind === "project";
    const children = entry.children.filter(hasArea);
    const sector = isFolder && children.length ? {
      ...region, outer: region.inner + Math.min(depth === 0 ? 36 : 13, (region.outer - region.inner) * .17),
    } : region;
    const labelHeight = Math.min(10,(sector.outer-sector.inner)*.21);
    const labelSector = entry.node.externalGroup && !entry.node.externalGroup.inline && labelHeight > 1.5
      ? { ...sector, outer:sector.inner+labelHeight } : undefined;
    const fields: Tile["fields"] = [];
    const dots: Dot[] = [];
    let start = sector.start;
    if (entry.node.externalGroup) {
      fields.push({source:"External",sector:{...sector,inner:labelSector?.outer ?? sector.inner}});
    }
    for (const source of entry.node.externalGroup ? [] : SOURCES) {
      const members = entry.decls.filter(decl => decl.source === source);
      if (!members.length) continue;
      const end = start + (sector.end - sector.start) * members.length / entry.decls.length;
      const field = { ...sector, start, end, inner:labelSector?.outer ?? sector.inner };
      fields.push({ source, sector: field });
      if (source !== "External") dots.push(...dotGrid(members,inset(field,.8)));
      start = end;
    }
    const glyphs: Tile["glyphs"] = {};
    for (const dot of dots) glyphs[dot.decl.source] = (glyphs[dot.decl.source] ?? "") + pointGlyph(dot);
    tiles.push({ plotted: true, entry, sector, labelSector, bounds, color: entry.sources.includes("Physlib") ? "var(--band-physlib)" : entry.sources.includes("PhyslibAlpha") ? "var(--band-alpha)" : "var(--band-external)", fields, dots, glyphs });
    entry.children.filter(child => !hasArea(child)).forEach(child => indexOnly(child, bounds));
    if (children.length) {
      divide(children, { ...region, inner: sector.outer }, depth+1);
    }
  }
  // Divide along the longer physical dimension, using annular area as weight.
  function divide(items: Entry[], region: Sector, depth: number) {
    if (items.length === 1) { place(items[0], region, depth); return; }
    const total = items.reduce((n, v) => n + v.weight, 0);
    let first = 1, weight = items[0].weight;
    while (first < items.length - 1 && weight + items[first].weight / 2 < total / 2) weight += items[first++].weight;
    const ratio = weight / total;
    let left = region, right = region;
    if ((region.end - region.start) * (region.inner + region.outer) / 2 > region.outer - region.inner) {
      const middle = region.start + ratio * (region.end - region.start);
      left = { ...region, end: middle }; right = { ...region, start: middle };
    } else {
      const middle = Math.sqrt(region.inner ** 2 + ratio * (region.outer ** 2 - region.inner ** 2));
      left = { ...region, outer: middle }; right = { ...region, inner: middle };
    }
    divide(items.slice(0, first), left, depth);
    divide(items.slice(first), right, depth);
  }
  const innerRadius = 268;
  const total = drawnRoots.reduce((n,item) => n + item.weight,0);
  allRoots.filter(item => !hasArea(item)).forEach(item => indexOnly(item, {start:0,end:TAU,inner:innerRadius,outer:492}));
  let start = 0;
  for (const root of drawnRoots) {
    const end = start + TAU * root.weight / total;
    place(root, { start, end, inner:innerRadius, outer:492 }, 0);
    start = end;
  }
  return { roots, tiles, missing:coverage?.missing ?? [] };
}

export type Camera = { x: number; y: number; size: number };
export const WHOLE: Camera = { x: 0, y: 0, size: 1016 };
export function frame(s: Sector): Camera {
  const angles = [s.start, s.end, ...[0, Math.PI/2, Math.PI, 1.5*Math.PI, TAU].filter(a => a > s.start && a < s.end)];
  const points = angles.flatMap(a => [polar(a, s.inner), polar(a, s.outer)]);
  const xx = points.map(p => p.x), yy = points.map(p => p.y);
  const left = Math.min(...xx), right = Math.max(...xx), top = Math.min(...yy), bottom = Math.max(...yy);
  return { x: (left+right)/2, y: (top+bottom)/2, size: Math.max(12, (right-left)*1.18, (bottom-top)*1.18) };
}
