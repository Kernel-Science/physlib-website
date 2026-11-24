// Module arrows point from a prerequisite to the file that imports it. Arrange
// each topological layer below the previous one, including its tallest node.
// Graphviz measures the same multiline labels used in the focused graphs.
const nodeLine = /^\s*"([^"]+)"\s*\[([^\]]*)\];\s*$/;
const edgeLine = /^\s*"([^"]+)"\s*->\s*"([^"]+)"/;
const columnGap = 16;
const rowGap = 12;
const rankGap = 24;
const radius = 15;
const labelGap = 4;
const lineHeight = 15;

function quotedAttribute(attrs, name) {
  const match = attrs.match(new RegExp('(?:^|[\\[,\\s])' + name + '=("(?:[^"\\\\]|\\\\.)*")'));
  return match ? JSON.parse(match[1]) : undefined;
}

function readGraph(graphviz, dot) {
  const grouped = /^\s*digraph "subject_modules"/.test(dot);
  const nodes = new Map();
  const edges = [];
  const sizesDot = ['digraph {'];
  for (const line of dot.split('\n')) {
    const node = line.match(nodeLine);
    if (node) {
      const [, name, attrs] = node;
      const label = quotedAttribute(attrs, 'xlabel') || quotedAttribute(attrs, 'label') || name;
      const aggregate = name.startsWith('subject:');
      nodes.set(name, {
        name, labels: label.split('\n'), href: quotedAttribute(attrs, 'URL'), classes: quotedAttribute(attrs, 'class') ?? '',
        tooltip: quotedAttribute(attrs, 'tooltip') ?? name, radius: aggregate ? 23 : radius,
        context: grouped && (aggregate || name === 'Physlib'),
        selected: /\bperipheries=2\b/.test(attrs), parents: [], children: [], rank: 0, order: 0, topicOrder: 0,
      });
      sizesDot.push(`"${name}" [label=${JSON.stringify(label)}, fontsize=13, shape=plain, pos="0,0!"];`);
      continue;
    }
    const edge = line.match(edgeLine);
    if (edge) edges.push({ from: edge[1], to: edge[2], tooltip: quotedAttribute(line, 'tooltip') });
    else if (/^\s*node\s*\[/.test(line)) sizesDot.push(line);
  }
  sizesDot.push('}');
  const metrics = JSON.parse(graphviz.layout(sizesDot.join('\n'), 'json', 'nop2'));
  for (const { name, width } of metrics.objects ?? []) {
    const node = nodes.get(name);
    node.width = Math.max(2 * node.radius, Number(width) * 72 + 6);
    node.height = 2 * node.radius + labelGap + node.labels.length * lineHeight;
  }
  for (const edge of edges) {
    edge.from = nodes.get(edge.from);
    edge.to = nodes.get(edge.to);
    // Contracting folders can make a quotient graph cyclic even though every
    // original module dependency is acyclic. Rank only the expanded modules.
    if (!edge.from.context && !edge.to.context) {
      edge.from.children.push(edge.to);
      edge.to.parents.push(edge.from);
    }
  }
  return { nodes: [...nodes.values()], edges, grouped };
}

function orderedRanks(nodes) {
  const pending = new Map(nodes.map(n => [n, n.parents.length]));
  const queue = nodes.filter(n => !n.parents.length);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    for (const next of current.children) {
      next.rank = Math.max(next.rank, current.rank + 1);
      pending.set(next, pending.get(next) - 1);
      if (!pending.get(next)) queue.push(next);
    }
  }
  if (queue.length !== nodes.length) throw new Error('The module imports contain a cycle.');

  // A short branch needn't start in the first row merely because it has no
  // prerequisites. Move it toward its consumers within its legal rank range.
  // Both bounds increase along every edge, so their average preserves order.
  const depth = Math.max(...nodes.map(n => n.rank));
  for (const node of [...queue].reverse()) {
    node.latest = node.children.length ? Math.min(...node.children.map(n => n.latest)) - 1 : depth;
  }
  for (const node of nodes) node.rank = Math.floor((node.rank + node.latest) / 2);

  const ranks = [];
  const subjects = [...new Set(nodes.map(n => n.name.split('.')[1] ?? ''))].sort();
  for (const [i, node] of nodes.entries()) {
    (ranks[node.rank] ??= []).push(node);
    const subject = node.name.split('.')[1];
    node.topicOrder = subjects.length === 1 ? (i + 0.5) / nodes.length
      : subject ? (subjects.indexOf(subject) + 0.5) / subjects.length : 0.5;
    node.order = node.topicOrder;
  }
  // Alternate down/up sweeps. Nearby dependencies are stronger ordering cues
  // than long transitive links. The library entry point pulls every subject
  // equally, and would otherwise shrink the whole drawing toward its center.
  for (let pass = 0; pass < 8; pass++) {
    const forward = pass % 2 === 0;
    for (const rank of forward ? ranks : [...ranks].reverse()) {
      for (const node of rank) {
        let sum = 0.65 * node.topicOrder;
        let weight = 0.65;
        for (const neighbor of forward ? node.parents : node.children) {
          if (neighbor.name === 'Physlib' || node.name === 'Physlib') continue;
          const w = 1 / Math.abs(node.rank - neighbor.rank);
          sum += w * neighbor.order;
          weight += w;
        }
        node.order = sum / weight;
      }
      rank.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'en'));
    }
  }
  return ranks;
}

// Pack consecutive layers into rows. Interleave oversized layers across rows
// so a subject keeps its horizontal position even where a layer is very wide.
function packRows(ranks, width) {
  const rows = [];
  let y = 0;
  for (const rank of ranks) {
    const totalWidth = rank.reduce((sum, node) => sum + node.width + columnGap, -columnGap);
    const bandCount = Math.max(1, Math.ceil(totalWidth / width));
    const lengths = Array(bandCount).fill(0);
    const bands = Array.from({ length: bandCount }, () => []);
    for (const node of rank) {
      let band = lengths.indexOf(Math.min(...lengths));
      if (lengths[band] + (bands[band].length ? columnGap : 0) + node.width > width) {
        band = bands.length;
        bands.push([]);
        lengths.push(0);
      }
      lengths[band] += node.width + (bands[band].length ? columnGap : 0);
      bands[band].push(node);
    }
    for (const band of bands) {
      const height = Math.max(...band.map(n => n.height));
      rows.push({ band, y });
      y += height + rowGap;
    }
    y += rankGap - rowGap;
  }
  return { rows, height: y - rankGap };
}

function fitRows(ranks, nodes) {
  const broadest = Math.max(...nodes.map(n => n.width)) + columnGap;
  let low = broadest, high = Math.max(broadest, nodes.reduce((sum, n) => sum + n.width + columnGap, 0));
  for (let step = 0; step < 20; step++) {
    const width = (low + high) / 2;
    if (width < 2 * packRows(ranks, width).height) low = width;
    else high = width;
  }
  return high;
}

function placeRows(rows, width) {
  for (const { band, y } of rows) {
    // Isotonic regression finds the least-squares horizontal position near
    // each node's barycenter, subject to label widths, margins and order.
    let occupied = 0;
    const blocks = [];
    for (const [i, node] of band.entries()) {
      node.offset = occupied + node.width / 2;
      occupied += node.width + columnGap;
      blocks.push({ start: i, end: i, sum: width * node.order - node.offset, size: 1 });
      while (blocks.length >= 2) {
        const right = blocks.at(-1), left = blocks.at(-2);
        if (left.sum / left.size <= right.sum / right.size) break;
        left.end = right.end;
        left.sum += right.sum;
        left.size += right.size;
        blocks.pop();
      }
    }
    const free = Math.max(0, width - occupied + columnGap);
    for (const block of blocks) {
      const shift = Math.max(0, Math.min(free, block.sum / block.size));
      for (let i = block.start; i <= block.end; i++) {
        const node = band[i];
        node.x = node.offset + shift;
        node.y = y + node.radius;
      }
    }
  }
}

function groupedRows(nodes, edges) {
  const modules = nodes.filter(n => !n.context);
  const context = nodes.filter(n => n.context);
  const ranks = modules.length ? orderedRanks(modules) : [];
  // Put subjects supplying the selected modules above them, and dependents
  // below. Mutual imports still have two separately drawn, oppositely directed
  // edges. Keep the library aggregator in the lower band.
  const balance = new Map(context.map(n => [n, 0]));
  for (const { from, to } of edges) {
    if (from.context && !to.context) balance.set(from, balance.get(from) + 1);
    if (to.context && !from.context) balance.set(to, balance.get(to) - 1);
  }
  context.sort((a, b) => Number(a.name === 'Physlib') - Number(b.name === 'Physlib')
    || balance.get(b) - balance.get(a) || a.name.localeCompare(b.name, 'en'));
  const middle = Math.ceil(context.length / 2);
  const before = context.slice(0, middle);
  const after = context.slice(middle);
  const sections = [...(before.length ? [before] : []), ...ranks, ...(after.length ? [after] : [])];
  const width = fitRows(sections, nodes);
  const { rows } = packRows(sections, width);
  for (const { band } of rows) {
    if (!band[0].context) continue;
    // Spread the small context key across the panel. A wrapped bank can have
    // different row lengths, so assign its positions after packing.
    band.forEach((n, i) => {
      n.order = band.length > 1 ? i / (band.length - 1) : before.includes(n) ? 0 : 1;
    });
  }
  placeRows(rows, width);
}

function fitAspect(nodes) {
  // In a narrow preset there may be just one subject in either context
  // bank, or a long chain surrounded by only a handful of other modules.
  // Only expand distances to fill the panel, preserving label clearance.
  for (let pass = 0; pass < 4; pass++) {
    const left = Math.min(...nodes.map(n => n.x - n.width / 2));
    const right = Math.max(...nodes.map(n => n.x + n.width / 2));
    const bottom = Math.max(...nodes.map(n => n.y - n.radius + n.height));
    const ratio = (right - left) / bottom;
    if (ratio >= 1.7 && ratio <= 2.3) break;
    if (ratio < 1.7) {
      for (const n of nodes) n.x = left + (n.x - left) * (1.9 / ratio);
    } else {
      for (const n of nodes) n.y = n.radius + (n.y - n.radius) * (ratio / 1.9);
    }
  }
}

function xml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

const coord = (n) => Number(n.toFixed(2));

function edgeSvg({ from, to, tooltip }, index, reciprocal) {
  const x1 = coord(from.x), x2 = coord(to.x);
  const y1 = coord(from.y + radius), tip = coord(to.y - radius);
  const base = coord(tip - 7);
  const bend = Math.min(70, (base - y1) / 2);
  let path = `M${x1},${y1} C${x1},${coord(y1 + bend)} ${x2},${coord(base - bend)} ${x2},${base}`;
  let points = `${coord(x2 - 3)},${base} ${x2},${tip} ${coord(x2 + 3)},${base}`;
  if (from.context || to.context) {
    const dx = to.x - from.x, dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    const arc = Math.min(reciprocal ? 55 : 18, length / 5);
    const cx = (from.x + to.x) / 2 - arc * dy / length;
    const cy = (from.y + to.y) / 2 + arc * dx / length;
    const lead = Math.hypot(cx - from.x, cy - from.y);
    const tail = Math.hypot(to.x - cx, to.y - cy);
    const ux = (to.x - cx) / tail, uy = (to.y - cy) / tail;
    const tx = to.x - to.radius * ux, ty = to.y - to.radius * uy;
    const bx = tx - 7 * ux, by = ty - 7 * uy;
    const pair = (x, y) => `${coord(x)},${coord(y)}`;
    path = `M${pair(from.x + from.radius * (cx - from.x) / lead, from.y + from.radius * (cy - from.y) / lead)} Q${pair(cx, cy)} ${pair(bx, by)}`;
    points = `${pair(bx - 3 * uy, by + 3 * ux)} ${pair(tx, ty)} ${pair(bx + 3 * uy, by - 3 * ux)}`;
  }
  const classes = to.name === 'Physlib' ? 'edge umbrella-import' : 'edge';
  const geometry = `<path fill="none" stroke="black" d="${path}"/><polygon fill="black" stroke="black" points="${points}"/>`;
  const content = tooltip ? `<g><title>${xml(tooltip)}</title>${geometry}</g>` : geometry;
  return `<g id="edge${index}" class="${classes}"><title>${xml(from.name)}-&gt;${xml(to.name)}</title>${content}</g>`;
}

function nodeSvg(node, index) {
  const x = coord(node.x), y = coord(node.y), name = xml(node.name);
  const label = node.labels.map((line, i) => {
    const baseline = coord(y + node.radius + labelGap + 12 + i * lineHeight);
    return `<text class="module-label" x="${x}" y="${baseline}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-size="13" style="paint-order:stroke;stroke:var(--surface,white);stroke-width:3;stroke-linejoin:round">${xml(line)}</text>`;
  }).join('');
  const ring = node.selected ? `<circle cx="${x}" cy="${y}" r="${radius + 2.5}" fill="none" stroke="black"/>` : '';
  const glyph = `${ring}<circle cx="${x}" cy="${y}" r="${node.radius}" stroke="black" fill="white"/>${label}`;
  const content = node.href ? `<a xlink:href="${xml(node.href)}" xlink:title="${xml(node.tooltip)}">${glyph}</a>` : glyph;
  return `<g id="node${index}" class="node ${xml(node.classes)}"><title>${name}</title>${content}</g>`;
}

/** Render the already filtered module DOT as a compact, directed hierarchy. */
export function layoutOverview(graphviz, dot) {
  const { nodes: values, edges: links, grouped } = readGraph(graphviz, dot);
  if (!values.length) return graphviz.dot(dot);
  if (grouped) groupedRows(values, links);
  else {
    const ranks = orderedRanks(values);
    const width = fitRows(ranks, values);
    placeRows(packRows(ranks, width).rows, width);
  }
  if (values.length > 1) fitAspect(values);
  const padding = 5;
  const left = Math.min(...values.map(n => n.x - n.width / 2)) - padding;
  const right = Math.max(...values.map(n => n.x + n.width / 2)) + padding;
  const width = coord(right - left);
  const height = coord(Math.max(...values.map(n => n.y - n.radius + n.height)) + 2 * padding);
  const edgeIds = new Set(links.map(({ from, to }) => from.name + '\0' + to.name));
  const edges = links.map((edge, i) => edgeSvg(edge, i + 1, edgeIds.has(edge.to.name + '\0' + edge.from.name)));
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}pt" height="${height}pt" viewBox="${coord(left)} -${padding} ${width} ${height}"><g class="graph" id="graph0"><title>import_graph</title>\n${edges.join('\n')}\n${values.map((n, i) => nodeSvg(n, i + 1)).join('\n')}\n</g></svg>`;
}
