const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const ts = require("typescript");

// These helpers have only type imports; transpile them for Node's test runner.
function loadHelper(name) {
  const filename = path.join(__dirname, "../src/lib", name);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, TextEncoder }, { filename });
  return exports;
}

const { atlasGuideUrl, atlasSnapshot, atlasHref, newAtlasTemplate, parseFullAtlas, editFileUrl } = loadHelper("atlas-article.ts");
const { atlasIssue } = loadHelper("atlas-issue.ts");

for (const [filename, guideFile] of [["API-map.md", undefined], ["Atlas.md", "docs/ATLAS_GUIDE.md"]]) {
  test(`cached ${filename} source and guide links use their immutable source revision`, () => {
    const file = `Physlib/Time/${filename}`;
    const data = { repo: "owner/repo", branch: "master", commit: "abc123", guideFile,
      nodes: [{ file, url: `https://github.com/owner/repo/blob/master/${file}` }] };
    const snapshot = atlasSnapshot(data);
    assert.equal(snapshot.nodes[0].url, `https://github.com/owner/repo/blob/abc123/${file}`);
    assert.equal(atlasGuideUrl(snapshot), `https://github.com/owner/repo/blob/abc123/${guideFile ?? "docs/API_MAP_GUIDE.md"}`);
    assert.equal(data.nodes[0].url, `https://github.com/owner/repo/blob/master/${file}`);
    // Editing follows the live branch; the issue payload retains its original base revision.
    assert.equal(editFileUrl(data.repo, data.branch, file), `https://github.com/owner/repo/edit/master/${file}`);
  });
}

test("Atlas links retain directory fragments and target the selected source file", () => {
  const directory = "Physlib/SpaceAndTime/Time";
  assert.equal(atlasHref(directory), `/atlas#${directory}`);
  assert.equal(editFileUrl("owner/repo", "master", `${directory}/Atlas.md`),
    `https://github.com/owner/repo/edit/master/${directory}/Atlas.md`);
});

for (const filename of ["Atlas.md", "API-map.md"]) {
  test(`editor preview resolves references to ${filename}`, () => {
    const text = newAtlasTemplate("Time").replace(
      "1. Author, *Title of book or paper*, chapter or section.",
      `1. Space — Physlib/SpaceAndTime/Space/${filename}`,
    );
    const preview = parseFullAtlas(text);
    assert.equal(preview.title, "Time");
    assert.equal(preview.references[0].atlas, "Physlib/SpaceAndTime/Space");
  });
}

for (const filename of ["API-map.md", "Atlas.md"]) {
  test(`suggestions target ${filename} while preserving the edit protocol and base hash`, () => {
    const file = `Physlib/SpaceAndTime/Time/${filename}`;
    const issue = atlasIssue({
      title: "Atlas: Time", heading: "Edit Time", facts: [], file,
      commit: "abc123", operation: { op: "replace-abstract", heading: "Abstract" },
      base: "  \nTime is real.  \n\n\nOrientation: ∂ₜ.\n  ",
    });
    const body = issue.body({ text: "Updated abstract.", summary: "Clarify Time.",
      diff: "", newReferences: [], withDiff: false });
    const marker = body.match(/<!-- api-map-edit\n(.*?)\n-->/s);
    assert.ok(marker);
    const payload = JSON.parse(marker[1]);
    assert.equal(payload.format, "api-map-edit");
    assert.equal(payload.version, 1);
    assert.equal(payload.file, file);
    assert.equal(payload.commit, "abc123");
    assert.match(payload.baseSha256, /^[a-f0-9]{64}$/);
    assert.equal(payload.baseSha256, createHash("sha256").update("Time is real.\n\nOrientation: ∂ₜ.", "utf8").digest("hex"));
    assert.ok(body.includes("<!-- api-map-edit:text -->"));
  });
}

test("a new Atlas file has no misleading prior commit or base hash", () => {
  const issue = atlasIssue({ title: "Atlas: new article", heading: "New article", facts: [],
    file: "Physlib/Example/Atlas.md", commit: "abc123", operation: { op: "create-file" }, base: null });
  const body = issue.body({ text: newAtlasTemplate("Example"), summary: "", diff: "",
    newReferences: [], withDiff: false });
  const payload = JSON.parse(body.match(/<!-- api-map-edit\n(.*?)\n-->/s)[1]);
  assert.equal(payload.file, "Physlib/Example/Atlas.md");
  assert.equal(payload.op, "create-file");
  assert.equal("commit" in payload, false);
  assert.equal("baseSha256" in payload, false);
});
