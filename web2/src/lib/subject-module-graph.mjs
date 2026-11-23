import { filterDot, ROOT_MODULE, SUBJECT_COLORS, subjectLabel } from "./dependency-graph.mjs";

/** Expand one subject in a filtered module graph. Each edge runs from prerequisite to importer.
 * @param {string} filteredDot @param {string} subjectName */
export function expandSubjectDot(filteredDot, subjectName) {
  // The normal input comes from filterDot. Raw import graphs use the same enrichment for source links and labels.
  const dot = filteredDot.includes("URL=") ? filteredDot : filterDot(filteredDot, [], []);
  const projected = new Map();
  const nodes = new Map();
  for (const [, name, attrs] of dot.matchAll(/^\s*"([^"]+)"\s*\[([^\]\n]*)\]/gm)) {
    if (projected.has(name)) continue;
    const subject = name.split(".")[1] ?? ROOT_MODULE;
    const expanded = subject === subjectName || name === ROOT_MODULE;
    const id = expanded ? name : `subject:${subject}`;
    projected.set(name, id);
    if (!nodes.has(id)) nodes.set(id, { subject, expanded, attrs, count: 0, internal: 0 });
    nodes.get(id).count++;
  }

  const edges = new Map();
  for (const [, prerequisite, importer] of dot.matchAll(/"([^"]+)"\s*->\s*"([^"]+)"/g)) {
    const from = projected.get(prerequisite);
    const to = projected.get(importer);
    if (!from || !to) continue;
    if (from === to && !nodes.get(from).expanded) {
      nodes.get(from).internal++;
      continue;
    }
    const key = `${from}\0${to}`;
    if (!edges.has(key)) edges.set(key, { from, to, count: 0 });
    edges.get(key).count++;
  }

  const lines = [
    'digraph "subject_modules" {',
    '  graph [rankdir=LR, nodesep=0.3, ranksep=0.6, outputorder=edgesfirst, forcelabels=true];',
    '  node [fontname="Helvetica", fontsize=12];',
    '  edge [arrowsize=0.65];',
  ];
  for (const [id, node] of nodes) {
    if (node.expanded) {
      // Keep the original ID, tooltip and source link. Draw the readable label alongside the small module glyph.
      const attrs = node.attrs.replace(/\blabel=("(?:\\.|[^"\\])*")/g, "xlabel=$1");
      lines.push(`  ${JSON.stringify(id)} [${attrs}, shape=circle, fixedsize=true, width=0.21, height=0.21, label=""];`);
    } else {
      const label = subjectLabel(node.subject);
      const count = `${node.count} ${node.count === 1 ? "module" : "modules"}`;
      const topic = Object.hasOwn(SUBJECT_COLORS, node.subject) ? node.subject : "Other";
      const tooltip = `${label}, ${count}, ${node.internal} internal ${node.internal === 1 ? "import" : "imports"}`;
      lines.push(`  ${JSON.stringify(id)} [shape=circle, fixedsize=true, width=0.38, height=0.38, class="module-subject subject-aggregate topic-${topic}", style=filled, fillcolor="${SUBJECT_COLORS[topic]}", label="", xlabel=${JSON.stringify(`${label}\n${count}`)}, tooltip=${JSON.stringify(tooltip)}, URL="#subject-${encodeURIComponent(node.subject)}"];`);
    }
  }
  for (const { from, to, count } of edges.values()) {
    const tooltip = `${count} direct module ${count === 1 ? "import" : "imports"}`;
    const umbrellaClass = to === ROOT_MODULE ? ', class="umbrella-import"' : "";
    lines.push(`  ${JSON.stringify(from)} -> ${JSON.stringify(to)} [tooltip=${JSON.stringify(tooltip)}${umbrellaClass}];`);
  }
  return [...lines, "}"].join("\n");
}
