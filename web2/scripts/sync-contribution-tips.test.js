const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { parseContributionTips } = require("../src/lib/contribution-tips-content");
const { syncContributionTips } = require("./sync-contribution-tips");

const fixture = [
  "# Contribution tips", "", '<a id="take-time"></a>', "",
  "## 1. Take your time", "", "Check your work.", "",
  '<a id="review"></a>', "", "## 2. Review", "", "Help review other contributions.", "",
].join("\n");
const commit = "a".repeat(40);

function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "physlib-tips-test-"));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("physlib-tips-test-"));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const sourceFile = path.join(directory, "source.md");
  fs.writeFileSync(sourceFile, fixture);
  return { sourceFile, outputDir: path.join(directory, "snapshot") };
}

function remote(markdown, sha = commit) {
  return async (url) => {
    if (url.endsWith("/commits/master")) return Response.json({ sha });
    assert.ok(url.endsWith("contents/docs/contribution-tips.md?ref=" + sha));
    return Response.json({ type: "file", encoding: "base64", content: Buffer.from(markdown).toString("base64") });
  };
}

function snapshot(directory) {
  return {
    markdown: fs.readFileSync(path.join(directory, "contribution-tips.md"), "utf8"),
    source: fs.readFileSync(path.join(directory, "contribution-tips.source.json"), "utf8"),
  };
}

test("copies local Markdown exactly and keeps stable tip links", async (t) => {
  const options = workspace(t);
  assert.deepEqual(await syncContributionTips(options), { changed: true, count: 2 });
  const result = snapshot(options.outputDir);
  assert.equal(result.markdown, fixture);
  assert.equal(JSON.parse(result.source).commit, null);
  assert.deepEqual(parseContributionTips(result.markdown).map((tip) => tip.id), ["take-time", "review"]);
  assert.deepEqual(await syncContributionTips(options), { changed: false, count: 2 });
});

test("downloads a file pinned to the retrieved commit and records its provenance", async (t) => {
  const { outputDir } = workspace(t);
  await syncContributionTips({ outputDir, fetcher: remote(fixture) });
  assert.equal(snapshot(outputDir).markdown, fixture);
  assert.equal(JSON.parse(snapshot(outputDir).source).commit, commit);
});

test("does not update the snapshot for unrelated upstream commits", async (t) => {
  const { outputDir } = workspace(t);
  await syncContributionTips({ outputDir, fetcher: remote(fixture) });
  const before = snapshot(outputDir);
  assert.deepEqual(await syncContributionTips({ outputDir, fetcher: remote(fixture, "b".repeat(40)) }),
    { changed: false, count: 2 });
  assert.deepEqual(snapshot(outputDir), before);
});

test("upgrades a local seed to verified upstream provenance", async (t) => {
  const options = workspace(t);
  await syncContributionTips(options);
  assert.deepEqual(await syncContributionTips({ outputDir: options.outputDir, fetcher: remote(fixture) }),
    { changed: true, count: 2 });
  assert.equal(JSON.parse(snapshot(options.outputDir).source).commit, commit);
});

test("keeps both generated files on an HTTP error", async (t) => {
  const options = workspace(t);
  await syncContributionTips(options);
  const before = snapshot(options.outputDir);
  await assert.rejects(syncContributionTips({
    outputDir: options.outputDir,
    fetcher: async () => new Response("Not found", { status: 404 }),
  }), /HTTP 404/);
  assert.deepEqual(snapshot(options.outputDir), before);
});

test("keeps both generated files on a network or validation error", async (t) => {
  const options = workspace(t);
  await syncContributionTips(options);
  const before = snapshot(options.outputDir);
  await assert.rejects(syncContributionTips({
    outputDir: options.outputDir, fetcher: async () => { throw new Error("offline"); },
  }), /offline/);
  await assert.rejects(syncContributionTips({
    outputDir: options.outputDir, fetcher: remote("# Empty document"),
  }), /must start/);
  assert.deepEqual(snapshot(options.outputDir), before);
});

test("rejects duplicate links, missing bodies, and nonconsecutive numbering", () => {
  assert.throws(() => parseContributionTips(fixture.replace('id="review"', 'id="take-time"')), /unique/);
  assert.throws(() => parseContributionTips(fixture.replace("Help review other contributions.", "")), /nonempty/);
  assert.throws(() => parseContributionTips(fixture.replace("## 2.", "## 4.")), /consecutive/);
});

test("rejects unclosed code fences but accepts headings inside a closed example", () => {
  const fence = String.fromCharCode(96).repeat(3);
  assert.throws(() => parseContributionTips(fixture + fence + "lean\n"), /unclosed/);
  const tips = parseContributionTips(fixture + fence + "text\n## 99. An example heading\n" + fence + "\n");
  assert.equal(tips.length, 2);
});

test("rejects a missing anchor and an oversized source", () => {
  assert.throws(() => parseContributionTips(fixture.replace('<a id="review"></a>\n\n', "")), /stable anchor/);
  assert.throws(() => parseContributionTips(fixture + "x".repeat(1024 * 1024)), /smaller/);
});
