import assert from "node:assert/strict";
import test from "node:test";
import { Graphviz } from "@hpcc-js/wasm/graphviz";
import { filterDot } from "../src/lib/dependency-graph.mjs";
import { layoutOverview } from "../src/lib/dependency-layout.mjs";
import { expandSubjectDot } from "../src/lib/subject-module-graph.mjs";

const optics = "Physlib.Optics.Geometry";
const ray = "Physlib.Optics.Ray";
const linear = "Physlib.Mathematics.Linear";
const matrix = "Physlib.Mathematics.Matrix";
const metric = "Physlib.Relativity.Metric";
const isolated = "Physlib.Optics.Standalone";
const names = [optics, ray, linear, matrix, metric, isolated, "Physlib"];
// The individual modules form a DAG. Contracting Mathematics and Relativity
// creates a pair of opposite edges because they import different modules.
const edges = [[linear, metric], [metric, matrix], [linear, optics], [matrix, optics], [optics, ray], [ray, "Physlib"]];
const dot = filterDot([
  "digraph {", ...names.map(n => `"${n}" [shape=ellipse];`),
  ...edges.map(([from, to]) => `"${from}" -> "${to}";`), "}",
].join("\n"), [], []);
const engine = await Graphviz.load();

function svgGroups(svg, kind) {
  const groups = svg.match(new RegExp(`<g\\b[^>]*\\bid="${kind}\\d+"[^>]*>[\\s\\S]*?</g>`, "g")) ?? [];
  return new Map(groups.map(group => {
    const title = group.match(/<title>([^<]*)<\/title>/)[1].replaceAll("&gt;", ">");
    return [title, group];
  }));
}

function circle(group) {
  const tag = group.match(/<circle\b[^>]*>/)[0];
  const attr = key => Number(tag.match(new RegExp(`\\b${key}="([^"]+)"`))[1]);
  return { x: attr("cx"), y: attr("cy"), r: attr("r") };
}

function assertArrowEndsAt(edge, node) {
  const points = edge.match(/<polygon[^>]*\bpoints="([^"]+)"/)[1];
  const [x, y] = points.split(" ")[1].split(",").map(Number);
  assert.ok(Math.abs(Math.hypot(x - node.x, y - node.y) - node.r) < 0.03);
}

test("module SVG retains every canonical ID, source link and import, including isolated nodes", () => {
  const svg = layoutOverview(engine, dot);
  const marks = svgGroups(svg, "node");
  const links = svgGroups(svg, "edge");
  assert.deepEqual([...marks.keys()].sort(), [...names].sort());
  assert.deepEqual([...links.keys()].sort(), edges.map(pair => pair.join("->")).sort());
  for (const [name, mark] of marks) {
    assert.equal(circle(mark).r, circle(marks.get(optics)).r);
    assert.ok(mark.includes(`/${name.replaceAll(".", "/")}.lean"`));
  }
  for (const [from, to] of edges) {
    assert.ok(circle(marks.get(from)).y < circle(marks.get(to)).y);
    assertArrowEndsAt(links.get(from + "->" + to), circle(marks.get(to)));
  }
});

test("expanded subject SVG keeps real labels, counts and both directions of a cyclic projection", () => {
  const svg = layoutOverview(engine, expandSubjectDot(dot, "Optics"));
  const marks = svgGroups(svg, "node");
  const links = svgGroups(svg, "edge");
  const math = "subject:Mathematics", relativity = "subject:Relativity";
  assert.deepEqual([...marks.keys()].sort(), [optics, ray, isolated, "Physlib", math, relativity].sort());
  assert.match(marks.get(math), /xlink:href="#subject-Mathematics"/);
  assert.match(marks.get(math), />2 modules<\/text>/);
  assert.match(marks.get(ray), />Ray<\/text>/);
  assert.ok(circle(marks.get(math)).r > circle(marks.get(optics)).r);
  assert.ok(circle(marks.get(optics)).y < circle(marks.get(ray)).y);
  assert.match(links.get(math + "->" + optics), /2 direct module imports/);
  for (const [from, to] of [[math, relativity], [relativity, math]]) {
    assertArrowEndsAt(links.get(from + "->" + to), circle(marks.get(to)));
  }
});
