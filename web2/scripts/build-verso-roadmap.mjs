// Refresh the checked-in radial view from Verso's published indexes and the
// site's own API maps. Run with: node scripts/build-verso-roadmap.mjs
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { citedClaims, paragraphsOf } from "./api-map-claims.js";
import { buildExternalCatalogue, retireProjectFiles } from "./build-external-catalogue.mjs";

const wiki = "https://jstoobysmith.github.io/PhyslibVerso/";
const roadmap = new URL("roadmap/", wiki);
const sources = ["Physlib", "PhyslibAlpha", "External", "UnformalizedClaims"];
const libraries = new Set(["Physlib", "PhyslibAlpha"]);

async function publishedJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Could not read ${url}: HTTP ${response.status}`);
  return response.json();
}

const auditUrl = new URL("../public/roadmap-view/declarations/index.json", import.meta.url);
const audit = JSON.parse(await readFile(auditUrl, "utf8"));
const auditedRepositories = new Set(audit.repositories);
const [upstream, xref, maps, native, nativeDecls, catalogue] = await Promise.all([
  publishedJson(new URL("roadmap-data.json", roadmap)),
  publishedJson(new URL("xref.json", wiki)),
  readFile(new URL("../data/APIMap.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../data/RoadmapNativeFolders.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../data/RoadmapNativeDeclarations.json", import.meta.url), "utf8").then(JSON.parse),
  buildExternalCatalogue(),
]);
if (native.revision !== maps.commit) throw Error("Refresh the native directory reference for the API map revision.");
if (nativeDecls.revision !== native.revision || nativeDecls.repository !== native.repository ||
    Object.keys(nativeDecls.files).length !== native.files.length ||
    !native.files.every(path => Object.hasOwn(nativeDecls.files, path))) {
  throw Error("Rebuild the native declarations for every file at the pinned source revision.");
}
const directories = new Set(["", ...native.folders.map(f => f.path), ...native.quantumInfoFolders.map(f => f.replaceAll("/", "."))]);
const files = new Set(native.files);
const publishedModules = new Map();
function nearestDirectory(path) {
  while (!directories.has(path)) path = path.includes(".") ? path.slice(0,path.lastIndexOf(".")) : "";
  return path;
}

const root = { name: "Physlib", path: "", children: [] };
const nodes = new Map([["", root]]);
function at(path) {
  if (nodes.has(path)) return nodes.get(path);
  const split = path.lastIndexOf(".");
  const parent = at(split < 0 ? "" : path.slice(0, split));
  const node = { name: path.slice(split + 1), path, children: [] };
  parent.children.push(node);
  nodes.set(path, node);
  return node;
}

function addModule(node, source, href, label) {
  node.moduleLinks ??= [];
  if (!node.moduleLinks.some((link) => link.source === source && link.href === href)) {
    node.moduleLinks.push({ source, href, label });
  }
  node.moduleHref ??= href;
  node.sources ??= [];
  if (!node.sources.includes(source)) node.sources.push(source);
  node.decls ??= [];
}

// Retain published wiki links through verified source renames. An older
// article with no known current file is a leaf under its closest real folder.
for (const [mod, entries] of Object.entries(xref["VersoHtml.module"].contents)) {
  const [source, ...segments] = mod.split(".");
  if (!libraries.has(source)) continue;
  const address = entries.find((entry) => entry.address)?.address;
  if (!address) throw new Error(`Missing Verso page for ${mod}`);
  const oldSource = mod.replaceAll(".", "/") + ".lean";
  const sourcePath = native.formerFiles?.[oldSource] ?? oldSource;
  const existing = files.has(sourcePath);
  let path;
  if (existing) {
    path = sourcePath.replace(/^(?:PhyslibAlpha|Physlib)\//,"").slice(0,-5).replaceAll("/",".");
  } else {
    const parent = nearestDirectory(segments.slice(0,-1).join("."));
    path = [parent, "~verso-" + mod.replaceAll(".","%2E")].filter(Boolean).join(".");
  }
  const node = at(path);
  if (!existing) node.name = segments.at(-1) ?? source;
  const wikiPath = segments.join(".") || source;
  if (wikiPath !== path) {
    node.wikiPaths ??= [];
    if (!node.wikiPaths.includes(wikiPath)) node.wikiPaths.push(wikiPath);
  }
  const href = new URL(address.replace(/^\//, ""), wiki).href;
  addModule(node, source, href, existing ? `${source} on Verso` : "Published Verso Article (Earlier Revision)");
  publishedModules.set(source + "/" + wikiPath, node);
}

// Verso enriches current source declarations with published links. An article
// from an older revision never contributes an extra declaration to the totals.
const publishedAnchors = new Map();
function importPublished(node) {
  for (const decl of node.decls ?? []) {
    if (!libraries.has(decl.source)) continue;
    const file = publishedModules.get(decl.source + "/" + node.path);
    if (!file) {
      throw new Error(`Missing module for ${decl.source}.${node.path}`);
    }
    const href = new URL(decl.href, roadmap).href;
    if (!publishedAnchors.has(file)) publishedAnchors.set(file, new Map());
    publishedAnchors.get(file).set(decl.source + "/" + decl.name, href);
  }
  for (const child of node.children ?? []) importPublished(child);
}
importPublished(upstream.tree);

const nativeTotals = {};
for (const [sourcePath, declarations] of Object.entries(nativeDecls.files)) {
  const modulePath = sourcePath.slice(0, -5);
  const [library] = modulePath.split("/");
  const source = library === "QuantumInfo" ? "Physlib" : library;
  const path = modulePath.replace(/^(?:PhyslibAlpha|Physlib)\//, "").replaceAll("/", ".");
  const node = at(path);
  const href = `https://github.com/${maps.repo}/blob/${maps.commit}/${sourcePath.split("/").map(encodeURIComponent).join("/")}`;
  addModule(node, source, href, library + " on GitHub");
  const totals = nativeTotals[library] ??= { files: 0, declarations: 0 };
  totals.files++;
  totals.declarations += declarations.length;
  for (const [name, sourceKind, line] of declarations) {
    node.decls.push({
      name, source, sourceKind, line,
      kind: ["theorem", "lemma", "axiom"].includes(sourceKind) ? "thm" : "def",
      href: publishedAnchors.get(node)?.get(source + "/" + name) ?? href + "#L" + line,
    });
  }
}

// There is one TODO per explicit [TODO] claim in a map's Content sections.
// A missing article, empty module or outside claim corpus contributes none.
for (const article of maps.nodes) {
  const [library, ...segments] = article.path.split("/");
  const path = libraries.has(library) ? segments.join(".") : article.path.replaceAll("/", ".");
  if (!directories.has(path)) throw Error(`API map outside the native source hierarchy: ${path}`);
  const folder = at(path);
  const href = "/wiki#" + article.path.split("/").map(encodeURIComponent).join("/");
  folder.apiMapLinks ??= [];
  folder.apiMapLinks.push({ source: library, href, label: article.title });
  folder.apiMapHref ??= href;
  const todos = article.content.flatMap((section) =>
    [section.intro, ...section.subsections.map((sub) => sub.body)]
      .flatMap(paragraphsOf).flatMap(citedClaims).filter((claim) => !claim.done),
  );
  if (todos.length !== article.requirements.filter((r) => !r.done).length) {
    throw new Error(`Unmatched TODO count in ${article.file}`);
  }
  if (todos.length) {
    const group = at([path, `API-map-${library}-TODOs`].filter(Boolean).join("."));
    group.name = "Wiki TODOs";
    group.todoGroup = true;
    group.sources = ["UnformalizedClaims"];
    group.apiMapHref = href;
    group.decls = todos.map(({ statement }) => ({
      name: statement, source: "UnformalizedClaims", library, kind: "claim", statement, href,
    }));
  }

}

// The flat source catalogue remains available to the audit tool. Once audited,
// declarations appear in their physics topics and supersede the file listing.
for (const [topic, index] of Object.entries(audit.topics)) {
  if (!directories.has(topic)) throw Error(`Re-export audited declarations into native folders: ${topic}`);
  at(topic).externalIndex = index;
}
for (const { subject, ...project } of catalogue.markers) {
  if (auditedRepositories.has(project.repository)) continue;
  const marker = at([nearestDirectory(subject),project.repository.replaceAll(".", "%2E")].filter(Boolean).join("."));
  marker.name = project.repository.split("/")[1];
  marker.sources = ["External"];
  marker.externalProject = project;
}

for (const [path,node] of nodes) {
  if (node.children.length && !directories.has(path)) throw Error(`Folder absent from the native Git tree: ${path}`);
}
const bySource = Object.fromEntries(sources.map((source) => [source, 0]));
function count(node) {
  const children = node.children.sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (!children.length) delete node.children;
  for (const decl of node.decls ?? []) bySource[decl.source]++;
  const audited = node.externalIndex?.count ?? 0;
  bySource.External += audited;
  return children.reduce((sum, child) => sum + count(child), (node.decls?.length ?? 0) + audited);
}
const areas = root.children.sort((a, b) => a.name.localeCompare(b.name, "en"))
  .map((area) => ({ name: area.name, results: count(area) }));
const stats = { results: areas.reduce((sum, area) => sum + area.results, 0), bySource, areas: areas.length };
const data = { sources, nativeRevision: native.revision, stats: { ...stats, nativeLibraries: nativeTotals, externalCatalogue: catalogue.stats }, areas, tree: root,
  projects: catalogue.markers };
const dir = new URL("../public/roadmap-view/", import.meta.url);
await mkdir(dir, { recursive: true });
const out = new URL("roadmap-data.json", dir);
const pending = new URL(`roadmap-data.${process.pid}.tmp`, dir);
const oldDataset = await readFile(out, "utf8").then(JSON.parse).catch((err) => {
  if (err.code !== "ENOENT") throw err;
});
await writeFile(pending, JSON.stringify(data) + "\n");
await rename(pending, out);
await retireProjectFiles(oldDataset?.tree, new Set(catalogue.markers.map((p) => p.modulesHref)));
console.log("Roadmap results:", bySource);
console.log("External file catalogue:", catalogue.stats);
