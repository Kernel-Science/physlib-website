// Run on Node 22.6+ with: node --experimental-strip-types --test scripts/todo-tags.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { parseTodoYaml } from "../src/lib/yaml.ts";

function parseItems(...tags) {
  const rows = tags.map((tag) => `  - tag: ${tag}\n    line: 154\n    isInformalDef: false`);
  return parseTodoYaml(`Category: []\nTODOItem:\n${rows.join("\n")}`).TODOItem;
}

test("preserves the exact tag from Physlib issue #1978 and its old URL", () => {
  const [original, quoted] = parseItems("4053169801638854187", '"4053169801638854188"');
  assert.equal(original.tag, "4053169801638854187");
  assert.equal(original.legacyTag, "4053169801638854000");
  assert.equal(original.line, 154);
  assert.equal(original.isInformalDef, false);
  assert.equal(quoted.tag, "4053169801638854188");
  assert.equal(quoted.legacyTag, undefined);
});

test("omits a rounded alias if two cards used it or another card owns it", () => {
  for (const other of ["4053169801638854188", '"4053169801638854000"']) {
    const items = parseItems("4053169801638854187", other);
    assert.ok(items.every((item) => item.legacyTag === undefined));
  }
});
