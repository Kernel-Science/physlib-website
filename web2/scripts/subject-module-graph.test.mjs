import assert from "node:assert/strict";
import test from "node:test";
import { filterDot, moduleNames, ROOT_MODULE } from "../src/lib/dependency-graph.mjs";
import { expandSubjectDot } from "../src/lib/subject-module-graph.mjs";

const a = "Physlib.Optics.Geometry.Basic";
const b = "Physlib.Optics.Ray.Basic";
const x = "Physlib.Mathematics.Linear";
const y = "Physlib.Mathematics.Matrix";
const z = "Physlib.Relativity.Light";
const names = [ROOT_MODULE, a, b, x, y, z];
const imports = [[a, b], [x, a], [y, a], [a, y], [x, y], [y, z], [z, x], [a, ROOT_MODULE], [x, ROOT_MODULE], [y, ROOT_MODULE]];
const input = `digraph {\n${names.map(n => `  "${n}" [shape=ellipse];`).join("\n")}\n${imports.map(([from, to]) => `  "${from}" -> "${to}";`).join("\n")}\n}`;

test("expanded modules preserve their distinct canonical IDs and source links, including Physlib.lean", () => {
  const detail = expandSubjectDot(filterDot(input, [], []), "Optics");
  const ids = moduleNames(detail);
  assert.deepEqual(ids.sort(), [ROOT_MODULE, a, b, "subject:Mathematics", "subject:Relativity"].sort());
  assert.equal(new Set(ids).size, ids.length);
  for (const name of [a, b, ROOT_MODULE]) {
    assert.ok(detail.includes(`URL="https://github.com/leanprover-community/physlib/blob/master/${name.replaceAll(".", "/")}.lean"`));
  }
  assert.ok(detail.includes('xlabel="Geometry\\nBasic"'));
  assert.ok(detail.includes('xlabel="Ray\\nBasic"'));
  const aggregate = detail.split("\n").find(line => line.startsWith('  "subject:Mathematics" ['));
  assert.match(aggregate, /shape=circle/);
  assert.match(aggregate, /xlabel="Mathematics\\n2 modules"/);
  assert.ok(detail.includes('URL="#subject-Mathematics"'));
});

test("imports retain prerequisite-to-importer direction, both sides of cycles and original edge counts", () => {
  const detail = expandSubjectDot(input, "Optics");
  const edges = Array.from(detail.matchAll(/"([^"]+)" -> "([^"]+)" \[tooltip="(\d+) direct module imports?"/g),
    ([, from, to, count]) => [from, to, Number(count)]);
  assert.deepEqual(edges, [
    [a, b, 1], ["subject:Mathematics", a, 2], [a, "subject:Mathematics", 1],
    ["subject:Mathematics", "subject:Relativity", 1], ["subject:Relativity", "subject:Mathematics", 1],
    [a, ROOT_MODULE, 1], ["subject:Mathematics", ROOT_MODULE, 2],
  ]);
  assert.ok(detail.includes('tooltip="Mathematics, 2 modules, 1 internal import"'));
  assert.equal(edges.reduce((sum, edge) => sum + edge[2], 0) + 1, imports.length);
});

test("filtered selections keep only subjects in the input and keep the umbrella as a single real module", () => {
  const detail = expandSubjectDot(filterDot(input, [z], [b]), ROOT_MODULE);
  assert.deepEqual(moduleNames(detail).sort(), ["subject:Mathematics", "subject:Optics", "subject:Relativity"].sort());
  const root = expandSubjectDot(input, ROOT_MODULE);
  assert.deepEqual(moduleNames(root).sort(), [ROOT_MODULE, "subject:Mathematics", "subject:Optics", "subject:Relativity"].sort());
  assert.ok(!root.includes('"subject:Physlib"'));
});
