export const ROOT_MODULE = "Physlib";
export const SPACE_MODULE = "Physlib.SpaceAndTime.Space.Basic";
const sourceRoot = "https://github.com/leanprover-community/physlib/blob/master/";

// Subject identity comes from the module namespace, independently of the preset.
export const SUBJECT_COLORS = {
  ClassicalFieldTheory: "#e98965", ClassicalMechanics: "#e6ad47",
  CondensedMatter: "#80b840", Cosmology: "#aa8cdd",
  Electromagnetism: "#3cadba", FluidDynamics: "#58ada0",
  Mathematics: "#6db68b", Meta: "#99a6b4",
  Optics: "#d6a048", Particles: "#e594bf", QFT: "#bd80d6",
  QuantumMechanics: "#70a9e6", Relativity: "#e98b81",
  SpaceAndTime: "#9d9cde", StatisticalMechanics: "#9ab353",
  StringTheory: "#cc85ac", Thermodynamics: "#db9561",
  Units: "#baaa80", Physlib: "#8ea7b6", Other: "#8daab0",
};

/** @param {string[]} startNodes @param {Record<string, Set<string>>} graph */
function bfs(startNodes, graph) {
  const visited = new Set(startNodes);
  const queue = [...startNodes];
  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    for (const next of graph[node] ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

/** @param {string} name */
function moduleUrl(name) {
  return sourceRoot + name.split(".").map(encodeURIComponent).join("/") + ".lean";
}

/** @param {string} dot */
export function moduleNames(dot) {
  return Array.from(dot.matchAll(/^\s*"([^"]+)"\s*\[/gm), (m) => m[1]);
}

/** @param {string} name */
export function subjectLabel(name) {
  if (name === ROOT_MODULE) return "Physlib.lean";
  if (name === "QFT") return "Quantum Field Theory";
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\bAnd\b/g, "and");
}

/** @param {string} dot @param {string[]} names @param {boolean} includeRoot */
export function subjectSummary(dot, names, includeRoot = false) {
  const subjects = new Map();
  const namespace = (name) => name.split(".")[1] ?? (includeRoot ? ROOT_MODULE : null);
  for (const name of names) {
    const subject = namespace(name);
    if (!subject) continue;
    if (!subjects.has(subject)) {
      subjects.set(subject, { name: subject, label: subjectLabel(subject), count: 0, color: SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.Other, imports: new Map() });
    }
    subjects.get(subject).count++;
  }
  for (const [, from, to] of dot.matchAll(/"([^"]+)"\s*->\s*"([^"]+)"/g)) {
    const dependency = namespace(from);
    const importer = namespace(to);
    if (dependency === importer || !subjects.has(dependency) || !subjects.has(importer)) continue;
    const imports = subjects.get(importer).imports;
    imports.set(dependency, (imports.get(dependency) ?? 0) + 1);
  }
  return [...subjects.values()].map(({ imports, ...subject }) => ({
    ...subject,
    imports: Array.from(imports, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
  })).sort((a, b) => a.label.localeCompare(b.label));
}

// Keep the full DOT node ID for search, links, and edges. Qualify the visible
// label just enough to tell it apart from the other modules in this view.
/** @param {string[]} names */
function moduleLabels(names) {
  const suffixCounts = new Map();
  const suffixes = names.map((name) => {
    const parts = name.split(".");
    return parts.map((_, i) => parts.slice(i).join(".")).reverse();
  });
  for (const options of suffixes) {
    for (const suffix of options) {
      suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1);
    }
  }
  return new Map(names.map((name, i) => {
    const label = suffixes[i].find((suffix) =>
      suffixCounts.get(suffix) === 1 && suffix !== "Basic"
    ) ?? name;
    return [name, label.split(".").join("\n")];
  }));
}

/** @param {string} dotText @param {string[]} wantedSources @param {string[]} wantedTargets @param {string | null} subject */
export function filterDot(dotText, wantedSources, wantedTargets, subject = null) {
  // Names that aren't in the graph (a stale link) are dropped, so they act
  // as "not specified" rather than as a filter nothing can satisfy.
  const known = new Set(moduleNames(dotText));
  const sources = wantedSources.filter((name) => known.has(name));
  const targets = wantedTargets.filter((name) => known.has(name));

  const edgeRegex = /"([^"]+)"\s*->\s*"([^"]+)"/g;
  const adj = Object.create(null);
  const revAdj = Object.create(null);
  let m;

  while ((m = edgeRegex.exec(dotText)) !== null) {
    const [, from, to] = m;
    (adj[from] ??= new Set()).add(to);
    (revAdj[to] ??= new Set()).add(from);
  }

  // An empty side is "no constraint on that side", not "nothing": no start
  // modules means everything the end modules need, no end modules means
  // everything built on the start modules, and neither means the lot.
  const forward = sources.length ? bfs(sources, adj) : null;
  const backward = targets.length ? bfs(targets, revAdj) : null;
  const keeps = (name) =>
    (!subject || name.split(".")[1] === subject) &&
    (!forward || forward.has(name)) && (!backward || backward.has(name));

  // The chosen start/end modules get a double outline so they can be found
  // again in the drawing. (The root module is the default end point of
  // every view, so marking it would say nothing.)
  const endpoints = new Set([...sources, ...targets].filter((n) => n !== ROOT_MODULE));
  const labels = moduleLabels([...known].filter(keeps));

  // Match node lines: "Name" [...] on a single line (dot format outputs one node per line)
  const nodeRegex = /^\s*"([^"]+)"\s*\[([^\]]*)\]/gm;
  let result = 'digraph "import_graph" {\n  graph [rankdir=TB, outputorder=edgesfirst];\n';
  result += '  node [fontname="Helvetica" fontsize=13];\n  edge [arrowsize=0.7];\n';

  while ((m = nodeRegex.exec(dotText)) !== null) {
    const [, name, attrs] = m;
    if (!keeps(name)) continue;
    const subject = name.split(".")[1] ?? "Physlib";
    const nodeClass = Object.hasOwn(SUBJECT_COLORS, subject) ? subject : "Other";
    const extra = `class="module-subject topic-${nodeClass}", label=${JSON.stringify(labels.get(name))}, tooltip=${JSON.stringify(name)}, URL="${moduleUrl(name)}"${endpoints.has(name) ? ", peripheries=2" : ""}`;
    result += `  "${name}" [${attrs}, ${extra}];\n`;
  }

  edgeRegex.lastIndex = 0;
  while ((m = edgeRegex.exec(dotText)) !== null) {
    const [, from, to] = m;
    if (keeps(from) && keeps(to)) {
      const attrs = to === ROOT_MODULE ? ' [class="umbrella-import"]' : "";
      result += `  "${from}" -> "${to}"${attrs};\n`;
    }
  }

  return result + "}";
}
