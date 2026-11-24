import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readData = async (relative) =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
const articles = (await readData("../data/APIMap.json")).nodes;
const { tree } = await readData("../public/roadmap-view/roadmap-data.json");

function* walk(node) {
  yield node;
  for (const child of node.children ?? []) yield* walk(child);
}

const nodes = [...walk(tree)];
const hrefFor = (article) => "/wiki#" + article.path;

test("every native file and its current source declarations appear exactly once by library", async () => {
  const native = await readData("../data/RoadmapNativeDeclarations.json");
  const roadmap = await readData("../public/roadmap-view/roadmap-data.json");
  assert.equal(roadmap.nativeRevision, native.revision);
  const base = `https://github.com/${native.repository}/blob/${native.revision}/`;
  const included = new Set();
  for (const node of nodes) {
    const expected = [];
    for (const link of node.moduleLinks ?? []) {
      if (!link.href.startsWith(base)) continue;
      const path = decodeURIComponent(link.href.slice(base.length));
      assert.ok(!included.has(path), "Duplicate native module: " + path);
      included.add(path);
      const source = path.split(/[/.]/)[0] === "PhyslibAlpha" ? "PhyslibAlpha" : "Physlib";
      assert.equal(link.source, source, path);
      for (const [name, kind, line] of native.files[path]) expected.push([source, name, kind, line]);
    }
    const actual = (node.decls ?? []).filter(d => d.source === "Physlib" || d.source === "PhyslibAlpha")
      .map(d => [d.source, d.name, d.sourceKind, d.line]);
    assert.deepEqual(actual.sort(), expected.sort(), node.path);
  }
  assert.deepEqual([...included].sort(), Object.keys(native.files).sort());
});

test("every directory shown in the roadmap exists in the source repository", async () => {
  const native = await readData("../data/RoadmapNativeFolders.json");
  const folders = new Set(["", ...native.folders.map(f => f.path),
    ...native.quantumInfoFolders.map(path => path.replaceAll("/", "."))]);
  for (const node of nodes) {
    if (node.children?.length || node.externalIndex) assert.ok(folders.has(node.path), node.path);
  }
  for (const node of nodes.filter(n => n.path.includes("~verso-"))) {
    assert.ok(!node.children?.length && node.moduleLinks?.length, node.path);
  }
});

test("every written API map can be reached from its own folder", () => {
  const actual = nodes.flatMap(node => (node.apiMapLinks ?? []).map(link => [node.path, link.href]));
  const expected = articles.map(article => [
    article.path.replace(/^Physlib(?:Alpha)?\/?/, "").replaceAll("/", "."),
    hrefFor(article),
  ]);
  assert.deepEqual(actual.sort(), expected.sort());
});

test("unformalized markers correspond to the open claims in each individual API map", () => {
  const markers = nodes.flatMap(node =>
    (node.decls ?? []).filter(decl => decl.source === "UnformalizedClaims"));
  const counts = new Map();
  for (const marker of markers) {
    assert.ok(marker.statement?.trim());
    counts.set(marker.href, (counts.get(marker.href) ?? 0) + 1);
  }
  for (const article of articles) {
    const href = hrefFor(article);
    assert.equal(counts.get(href) ?? 0, article.requirements.filter(req => !req.done).length, article.path);
    counts.delete(href);
  }
  assert.equal(counts.size, 0, "A marker links outside the indexed API maps");
});

test("the published Units declaration deep link resolves to its wiki module and exact anchor", () => {
  const node = nodes.find(n => n.path === "Units.ISQBridge");
  const link = node.moduleLinks.find(link => link.source === "Physlib");
  const declaration = node.decls.find(decl => decl.name === "Dimension.toISQHom_injective");
  assert.equal(link.href, "https://jstoobysmith.github.io/PhyslibVerso/Physlib/Units/ISQBridge/");
  const href = new URL(declaration.href);
  assert.equal(href.origin + href.pathname, link.href);
  assert.ok(href.hash.length > 1);
});
