const { test } = require("node:test");
const assert = require("node:assert/strict");
const { atlasFiles, parseLiteratureReference, leanDirectories } = require("./generate-atlas");

test("discovers legacy, renamed, and mixed library articles", () => {
  assert.deepEqual(atlasFiles([
    "Physlib/SpaceAndTime/Time/Atlas.md",
    "Physlib/SpaceAndTime/Space/API-map.md",
    "PhyslibAlpha/Example/Atlas.md",
    "QuantumInfo/Example/Atlas.md",
    "docs/Atlas.md",
    "Physlib/SpaceAndTime/Time/Basic.lean",
  ]), [
    "Physlib/SpaceAndTime/Space/API-map.md",
    "Physlib/SpaceAndTime/Time/Atlas.md",
    "PhyslibAlpha/Example/Atlas.md",
    "QuantumInfo/Example/Atlas.md",
  ]);
});

test("prefers Atlas.md without double-counting either input order", () => {
  const files = ["Physlib/Time/Atlas.md", "Physlib/Time/API-map.md"];
  assert.deepEqual(atlasFiles(files), [files[0]]);
  assert.deepEqual(atlasFiles([...files].reverse()), [files[0]]);
});

for (const filename of ["Atlas.md", "API-map.md"]) {
  test(`resolves a literature citation to ${filename}`, () => {
    const text = `Time — Physlib/SpaceAndTime/Time/${filename}`;
    assert.deepEqual(parseLiteratureReference({ index: 2, text }), {
      index: 2, text, atlas: "Physlib/SpaceAndTime/Time",
    });
  });
}

test("keeps ordinary literature references as literature", () => {
  assert.deepEqual(parseLiteratureReference({ index: 1, text: "A textbook" }), {
    index: 1, text: "A textbook", atlas: null,
  });
});

test("marks both legacy and renamed directories as already documented", () => {
  const directories = leanDirectories([
    "Physlib/Time/Basic.lean", "Physlib/Time/API-map.md",
    "Physlib/Space/Basic.lean", "Physlib/Space/Atlas.md",
    "Physlib/Undocumented/Basic.lean",
  ]);
  assert.equal(directories.find((d) => d.path === "Physlib/Time").hasAtlas, true);
  assert.equal(directories.find((d) => d.path === "Physlib/Space").hasAtlas, true);
  assert.equal(directories.find((d) => d.path === "Physlib/Undocumented").hasAtlas, false);
});
