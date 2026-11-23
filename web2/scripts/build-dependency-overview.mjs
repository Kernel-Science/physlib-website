import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Graphviz } from "@hpcc-js/wasm/graphviz";
import { filterDot, ROOT_MODULE, SPACE_MODULE } from "../src/lib/dependency-graph.mjs";
import { layoutOverview } from "../src/lib/dependency-layout.mjs";
import { overviewFilename } from "../src/lib/dependency-overview.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const assets = path.join(root, "public/graph-assets");
const packages = path.join(root, "node_modules");
await mkdir(path.join(assets, "@hpcc-js"), { recursive: true });

// Keep the worker-discovery prefix that d3-graphviz expects. The overview only
// loads D3. A custom selection loads the same pinned Graphviz used below.
for (const [source, destination] of [
  ["d3/dist/d3.min.js", "d3.min.js"],
  ["d3/LICENSE", "d3.LICENSE"],
  ["@hpcc-js/wasm/dist/graphviz.umd.js", "@hpcc-js/wasm-graphviz.umd.js"],
  ["@hpcc-js/wasm/LICENSE", "@hpcc-js/wasm.LICENSE"],
  ["d3-graphviz/build/d3-graphviz.min.js", "d3-graphviz.min.js"],
  ["d3-graphviz/LICENSE", "d3-graphviz.LICENSE"],
]) {
  await copyFile(path.join(packages, source), path.join(assets, destination));
}

const input = await readFile(path.join(root, "public/my_graph.dot"), "utf8");
const graphviz = await Graphviz.load();
for (const sources of [[], [SPACE_MODULE]]) {
  const dot = filterDot(input, sources, [ROOT_MODULE]);
  const destination = path.join(assets, overviewFilename(dot));
  const svg = layoutOverview(graphviz, dot);
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, svg);
  await rename(temporary, destination);
  console.log(`Dependency overview ready: ${path.basename(destination)}`);
}
