import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (url) => JSON.parse(await readFile(url, "utf8"));
const data = await readJson(new URL("../public/roadmap-view/roadmap-data.json", import.meta.url));
function* walk(node) {
  yield node;
  for (const child of node.children ?? []) yield* walk(child);
}
const nodes = [...walk(data.tree)];

test("external project markers enumerate distinct real source files independently of result dots", async () => {
  const repositories = new Map();
  for (const node of nodes.filter(n => n.externalProject)) {
    assert.equal(node.decls, undefined, "An inventory must not introduce declaration dots");
  }
  const markers = data.projects ?? nodes.flatMap((n) => n.externalProject ? [n.externalProject] : []);
  assert.ok(markers.length > 0);
  let files = 0;
  for (const p of markers) {
    assert.match(p.modulesHref, /^\/roadmap-view\/projects\/[\w.-]+\.json$/);
    const manifest = await readJson(new URL("../public" + p.modulesHref, import.meta.url));
    assert.equal(p.repository, manifest.repository);
    assert.match(manifest.revision, /^[0-9a-f]{40}$/);
    assert.equal(p.fileCount, manifest.files.length);
    assert.ok(p.fileCount > 0);
    if (!repositories.has(p.repository)) repositories.set(p.repository, new Set());
    const paths = repositories.get(p.repository);
    for (const path of manifest.files) {
      assert.ok(path.endsWith(".lean") && !path.startsWith("/") && !path.split("/").includes(".."), path);
      assert.ok(!paths.has(path), `Repeated file in ${p.repository}: ${path}`);
      paths.add(path);
    }
    files += p.fileCount;
  }
  assert.deepEqual(data.stats.externalCatalogue, {
    repositories: repositories.size, files, markers: markers.length,
  });
  for (const node of nodes) {
    for (const module of node.moduleLinks ?? []) {
      if (module.source !== "External") continue;
      const url = new URL(module.href);
      assert.equal(url.origin, "https://github.com");
      const [, owner, repo, blob, revision, ...rest] = url.pathname.split("/");
      assert.equal(blob, "blob");
      assert.match(revision, /^[a-f0-9]{40}$/);
      assert.ok(repositories.get(owner + "/" + repo)?.has(rest.map(decodeURIComponent).join("/")),
        `Curated source is absent from its repository's inventory: ${url}`);
    }
  }
});
