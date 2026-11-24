import assert from "node:assert/strict";
import test from "node:test";
import { filterDot, moduleNames, ROOT_MODULE, subjectSummary } from "../src/lib/dependency-graph.mjs";

const matrices = "Physlib.Mathematics.Matrices";
const lens = "Physlib.Optics.Lens";
const ray = "Physlib.Optics.Ray";
const dot = `digraph {
  "${ROOT_MODULE}" [shape=ellipse];
  "${matrices}" [shape=ellipse];
  "${lens}" [shape=ellipse];
  "${ray}" [shape=ellipse];
  "${matrices}" -> "${lens}";
  "${matrices}" -> "${ray}";
  "${matrices}" -> "${ROOT_MODULE}";
  "${lens}" -> "${ROOT_MODULE}";
  "${ray}" -> "${ROOT_MODULE}";
}`;

test("the full graph retains every module, import direction, and canonical source link", () => {
  const all = filterDot(dot, [], [ROOT_MODULE]);
  assert.deepEqual(moduleNames(all).sort(), [ROOT_MODULE, matrices, lens, ray].sort());
  assert.equal((all.match(/class="umbrella-import"/g) ?? []).length, 3);
  assert.ok(all.includes(`"${matrices}" -> "${lens}"`));
  assert.ok(all.includes('URL="https://github.com/leanprover-community/physlib/blob/master/Physlib/Optics/Lens.lean"'));
  assert.ok(all.includes('URL="https://github.com/leanprover-community/physlib/blob/master/Physlib.lean"'));
});

test("a target includes its dependencies and a source includes its dependents", () => {
  assert.deepEqual(moduleNames(filterDot(dot, [], [lens])).sort(), [matrices, lens].sort());
  assert.deepEqual(moduleNames(filterDot(dot, [lens], [])).sort(), [ROOT_MODULE, lens].sort());
});

test("subject counts group the importers and exclude the umbrella module", () => {
  const summary = subjectSummary(dot, moduleNames(dot)).map(({ name, count, imports }) => ({ name, count, imports }));
  assert.deepEqual(summary, [
    { name: "Mathematics", count: 1, imports: [] },
    { name: "Optics", count: 2, imports: [{ name: "Mathematics", count: 2 }] },
  ]);
});

test("a subject detail keeps its modules even when they have no internal imports", () => {
  const optics = filterDot(dot, [], [], "Optics");
  assert.deepEqual(moduleNames(optics).sort(), [lens, ray].sort());
  assert.doesNotMatch(optics, /->/);
});
