const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
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

const { atlasHref, newAtlasTemplate, parseFullAtlas, editFileUrl } = loadHelper("atlas-article.ts");
const { atlasIssue } = loadHelper("atlas-issue.ts");

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

test("suggestions target Atlas.md while preserving the existing edit protocol", () => {
  const file = "Physlib/SpaceAndTime/Time/Atlas.md";
  const issue = atlasIssue({
    title: "Atlas: Time", heading: "Edit Time", facts: [], file,
    commit: "abc123", operation: { op: "replace-abstract", heading: "Abstract" },
    base: "Time is a real number.",
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
  assert.ok(body.includes("<!-- api-map-edit:text -->"));
});
