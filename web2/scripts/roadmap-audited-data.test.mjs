import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const publicRoot = new URL("../public/", import.meta.url);
const base = "/roadmap-view/declarations/";
const json = async href => JSON.parse(await readFile(new URL(href.slice(1), publicRoot), "utf8"));
const index = await json(base + "index.json");
const roadmap = await json("/roadmap-view/roadmap-data.json");
const review = JSON.parse(await readFile(new URL("../data/roadmap-audit/project-review.json", import.meta.url), "utf8"));
const registry = JSON.parse(await readFile(new URL("./roadmap-project-registry.json", import.meta.url), "utf8"));
const nativeCatalog = JSON.parse(await readFile(new URL("../data/RoadmapNativeFolders.json", import.meta.url), "utf8"));

function* walk(node) {
  yield node;
  for (const child of node.children ?? []) yield* walk(child);
}
const groups = Object.entries(index.topics).flatMap(([topic, entry]) =>
  entry.groups.map(group => ({ topic, group })));
const sum = values => values.reduce((a, b) => a + b, 0);
const groupsPattern = /^\/roadmap-view\/declarations\/p[0-9a-f]{20}\.json$/;
const projectsPattern = /^\/roadmap-view\/declarations\/r[0-9a-f]{20}\.json$/;
const recordsPattern = /^(\/roadmap-view\/declarations\/d(\d+)\.json\.gz)#((\d+)-(\d+|all))$/;
const statements = new Set(["theorem", "lemma", "axiom", "informal_lemma", "semiformal_result"]);

test("external work is published only at existing Lean directories or the root", () => {
  const folders = new Set(["", ...nativeCatalog.folders.map(folder => folder.path),
    ...nativeCatalog.quantumInfoFolders.map(path => path.replaceAll("/", "."))]);
  for (const topic of Object.keys(index.topics)) assert.ok(folders.has(topic), topic);
});

test("the published tree and index agree on each source's one named home and every topic total", () => {
  const attached = [...walk(roadmap.tree)].filter(node => node.externalIndex);
  assert.deepEqual(Object.fromEntries(attached.map(node => [node.path, node.externalIndex])), index.topics);
  const repos = new Set(index.repositories);
  assert.equal(repos.size, index.repositories.length);
  assert.deepEqual([...repos].sort(), Object.keys(review).sort());
  assert.deepEqual([...new Set(registry.map(row => row.repository))].sort(), [...repos].sort());
  const homes = new Map();
  const repoTotals = new Map();
  const groupFiles = new Set();
  for (const [topic, entry] of Object.entries(index.topics)) {
    assert.equal(sum(entry.groups.map(group => group.count)), entry.count, topic);
    for (const group of entry.groups) {
      assert.ok(group.count > 0);
      assert.match(group.href, groupsPattern);
      assert.ok(!groupFiles.has(group.href), group.href);
      groupFiles.add(group.href);
      assert.equal(sum(Object.values(group.counts)), group.count, topic);
      assert.equal(sum(Object.values(group.byProject)), group.count, topic);
      for (const [repository, count] of Object.entries(group.byProject)) {
        assert.ok(repos.has(repository) && Number.isSafeInteger(count) && count > 0, repository);
        repoTotals.set(repository, (repoTotals.get(repository) ?? 0) + count);
      }
      if (group.primary) {
        assert.equal(review[group.project].folder, topic, group.project);
        assert.ok(!group.inline && !homes.has(group.project), group.project);
        assert.deepEqual(group.byProject, { [group.project]: group.count });
        assert.match(group.allFilesHref, projectsPattern);
        homes.set(group.project, group);
      } else {
        assert.ok(group.inline && !group.project && !group.allFilesHref, topic);
      }
    }
  }
  assert.deepEqual([...homes.keys()].sort(), [...repos].sort());
  for (const [repo, home] of homes) assert.equal(home.totalCount, repoTotals.get(repo), repo);
  assert.equal(sum([...repoTotals.values()]), index.declarationCount);
  assert.equal(index.declarationCount, roadmap.stats.bySource.External);
  assert.equal(index.fileCount, roadmap.stats.externalCatalogue.files);
});

function parseRef(file) {
  const match = recordsPattern.exec(file.declsHref);
  assert.ok(match, file.declsHref);
  const [, batch, number, key, moduleId, part] = match;
  assert.equal(Math.floor(Number(moduleId) / 64), Number(number), file.declsHref);
  return { batch, key, part };
}

function assertPinnedSource(file) {
  const url = new URL(file.href);
  const [owner, project, blob, revision, ...path] = url.pathname.slice(1).split("/");
  assert.equal(url.origin, "https://github.com");
  assert.equal(owner + "/" + project, file.project);
  assert.equal(blob, "blob");
  assert.match(revision, /^[0-9a-f]{40}$/);
  assert.equal(path.map(decodeURIComponent).join("/"), file.path);
  assert.ok(file.path.endsWith(".lean") && !file.path.split("/").includes(".."), file.path);
}

function id(row) {
  return JSON.stringify([row.line, row.kind, row.name, row.status]);
}

test("every topic fragment, sample and whole-project file resolves to the same audited declarations", async () => {
  const byBatch = new Map();
  const bySource = new Map();
  const fragmentRefs = new Set();
  const countsByTopic = new Map();
  for (const { topic, group } of groups) {
    const manifest = await json(group.href);
    assert.equal(manifest.files.length, group.files, group.href);
    const byProject = {};
    const inGroup = new Map();
    const topicSources = countsByTopic.get(topic) ?? new Set();
    countsByTopic.set(topic, topicSources);
    for (const file of manifest.files) {
      assertPinnedSource(file);
      assert.equal(sum(Object.values(file.counts)), file.count, file.href);
      assert.ok(!inGroup.has(file.href), file.href);
      const record = { file, samples: [] };
      inGroup.set(file.href, record);
      topicSources.add(file.href);
      byProject[file.project] = (byProject[file.project] ?? 0) + file.count;
      const { batch, part } = parseRef(file);
      assert.notEqual(part, "all");
      assert.ok(!fragmentRefs.has(file.declsHref), file.declsHref);
      fragmentRefs.add(file.declsHref);
      const source = bySource.get(file.href) ?? { batch, fragments: [] };
      assert.equal(source.batch, batch);
      if (!bySource.has(file.href)) {
        bySource.set(file.href, source);
        if (!byBatch.has(batch)) byBatch.set(batch, []);
        byBatch.get(batch).push(source);
      }
      source.fragments.push(record);
    }
    assert.deepEqual(byProject, group.byProject, group.href);
    const samplesSeen = new Set();
    for (const s of group.samples) {
      const url = new URL(s.href);
      assert.equal(url.hash, "#L" + s.line);
      url.hash = "";
      const record = inGroup.get(url.href);
      assert.ok(record, s.href);
      assert.equal(record.file.project, s.project);
      assert.equal(record.file.path, s.path);
      const key = s.href + id(s);
      assert.ok(!samplesSeen.has(key), key);
      samplesSeen.add(key);
      record.samples.push(s);
    }
  }
  for (const [topic, sources] of countsByTopic) assert.equal(sources.size, index.topics[topic].files);
  // Full-project manifests may reference several topic fragments from a single
  // source file. Check their union after collecting all topic manifests.
  for (const { group } of groups.filter(({group}) => group.primary)) {
    const whole = await json(group.allFilesHref);
    assert.equal(sum(whole.files.map(f => f.count)), group.totalCount, group.project);
    for (const file of whole.files) {
      assert.equal(file.project, group.project);
      const source = bySource.get(file.href);
      assert.ok(source && !source.whole, file.href);
      const {batch} = parseRef(file);
      assert.equal(source.batch, batch);
      assert.equal(file.count, sum(source.fragments.map(r => r.file.count)), file.href);
      source.whole = file;
    }
  }
  // Load one compressed batch at a time; duplicated records must agree even
  // if their declarations share a name, or came from different topic groups.
  let audited = 0;
  for (const [batch, sources] of byBatch) {
    const content = JSON.parse(gunzipSync(await readFile(new URL(batch.slice(1), publicRoot))));
    for (const source of sources) {
      assert.ok(source.whole, "missing project-wide file manifest");
      const placed = new Set();
      for (const {file, samples} of source.fragments) {
        const {key} = parseRef(file);
        const fragment = content[key];
        assert.ok(fragment, file.declsHref);
        assert.equal(fragment.declarations.length, file.count, file.declsHref);
        const sampleIds = new Set(samples.map(id));
        const counts = {def: 0, thm: 0, other: 0};
        for (const row of fragment.declarations) {
          assert.ok(Number.isSafeInteger(row.line) && row.line > 0 && row.name, file.declsHref);
          assert.notEqual(row.kind, "example");
          const key = id(row);
          assert.ok(!placed.has(key), file.href + "#L" + row.line);
          placed.add(key);
          sampleIds.delete(key);
          counts[statements.has(row.kind) ? "thm" : "def"]++;
        }
        assert.deepEqual(counts, file.counts, file.declsHref);
        assert.equal(sampleIds.size, 0, file.declsHref);
      }
      const whole = content[parseRef(source.whole).key]?.declarations;
      assert.ok(whole, source.whole.declsHref);
      assert.equal(whole.length, placed.size, source.whole.href);
      for (const row of whole) assert.ok(placed.delete(id(row)), source.whole.href);
      assert.equal(placed.size, 0);
      audited += whole.length;
    }
  }
  assert.equal(audited, index.declarationCount);
});
