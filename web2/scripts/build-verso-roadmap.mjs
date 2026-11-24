// Rebuild from the pinned Lean sources, Physlib API map claims and external audit.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { citedClaims, paragraphsOf } from "./api-map-claims.js";
import { buildExternalCatalogue, retireProjectFiles } from "./build-external-catalogue.mjs";

const sources = ["Physlib", "PhyslibAlpha", "External", "UnformalizedClaims"];
const libraries = new Set(["Physlib", "PhyslibAlpha"]);

const auditUrl = new URL("../public/roadmap-view/declarations/index.json", import.meta.url);
const audit = JSON.parse(await readFile(auditUrl, "utf8"));
const auditedRepositories = new Set(audit.repositories);
const [maps, native, nativeDecls, catalogue] = await Promise.all([
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

function treePath(sourcePath) {
  return sourcePath.slice(0, -5).replace(/^(?:PhyslibAlpha|Physlib)\//, "").replaceAll("/", ".");
}

const nativeTotals = {};
for (const [sourcePath, declarations] of Object.entries(nativeDecls.files)) {
  const [library] = sourcePath.slice(0, -5).split("/");
  const source = library === "QuantumInfo" ? "Physlib" : library;
  const node = at(treePath(sourcePath));
  const href = `https://github.com/${maps.repo}/blob/${maps.commit}/${sourcePath.split("/").map(encodeURIComponent).join("/")}`;
  addModule(node, source, href, library + " on GitHub");
  const totals = nativeTotals[library] ??= { files: 0, declarations: 0 };
  totals.files++;
  totals.declarations += declarations.length;
  for (const [name, sourceKind, line] of declarations) {
    node.decls.push({
      name, source, sourceKind, line,
      kind: ["theorem", "lemma", "axiom"].includes(sourceKind) ? "thm" : "def",
      href: href + "#L" + line,
    });
  }
}

// Preserve old Roadmap bookmarks for verified renames without creating a
// second file node or a second reading destination.
for (const [former, current] of Object.entries(native.formerFiles)) {
  const node = nodes.get(treePath(current));
  const alias = treePath(former);
  if (alias === node.path) continue;
  node.wikiPaths ??= [];
  if (!node.wikiPaths.includes(alias)) node.wikiPaths.push(alias);
}

// There is one TODO per explicit [TODO] claim in a map's Content sections.
// A missing article, empty module or outside claim corpus contributes none.
for (const article of maps.nodes) {
  const [library, ...segments] = article.path.split("/");
  const path = libraries.has(library) ? segments.join(".") : article.path.replaceAll("/", ".");
  if (!directories.has(path)) throw Error(`API map outside the native source hierarchy: ${path}`);
  const folder = at(path);
  const href = "/api-maps#" + article.path.split("/").map(encodeURIComponent).join("/");
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
    group.name = "API map TODOs";
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
const rootExternal = root.externalIndex?.count ?? 0;
bySource.External += rootExternal;
const stats = { results: areas.reduce((sum, area) => sum + area.results, rootExternal), bySource, areas: areas.length };
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
