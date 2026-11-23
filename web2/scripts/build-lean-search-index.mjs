import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// doc-gen4 emits a JSON declaration index with a .bmp extension. At build
// time, check those links against the rendered HTML and retain only Physlib
// modules. The search server needs this one compact file, not the docs tree.
const docsDir = fileURLToPath(new URL("../public/docs", import.meta.url));
const output = new URL("../data/LeanSearchIndex.json", import.meta.url);

async function readDocument(relative) {
  const file = path.resolve(docsDir, relative);
  if (!file.startsWith(docsDir + path.sep)) return null;
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function unescapeHtml(value) {
  const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, (entity, key) => {
    if (key[0] !== "#") return entities[key.toLowerCase()] ?? entity;
    const code = key[1]?.toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
    return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

function paragraph(html) {
  const match = /<p>([\s\S]*?)<\/p>/.exec(html);
  return match ? unescapeHtml(match[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() : "";
}

async function moduleEntries({ name, url, declarations }) {
  const html = await readDocument(url);
  if (!html) return [];
  const href = "/docs/" + url.slice(2);
  const firstModuleDoc = /<div class="mod_doc">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
  const rows = [{
    kind: "module", title: name, href, description: paragraph(firstModuleDoc) || "Lean module", context: name,
  }];
  const anchors = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), (match) => unescapeHtml(match[1])));
  const docstrings = new Map();
  // Keep later module commentary and constructor/field docs out of declaration descriptions.
  for (const match of html.matchAll(/<div class="decl" id="([^"]+)">([\s\S]*?)(?=<div class="(?:decl"|mod_doc")|<\/main>|$)/g)) {
    const prose = match[2].split(/<details\b|<ul class="(?:structure_fields|constructors)"/, 1)[0];
    const description = paragraph(prose);
    if (description) docstrings.set(unescapeHtml(match[1]), description);
  }
  for (const decl of declarations) {
    if (!anchors.has(decl.anchor)) continue;
    rows.push({
      kind: "declaration", title: decl.name, href: href + "#" + encodeURIComponent(decl.anchor),
      description: docstrings.get(decl.anchor) ?? `${decl.kind} in ${name}`,
      context: `${decl.kind} ${name}`,
    });
  }
  return rows;
}

async function libraryModules() {
  const raw = await readDocument("declarations/declaration-data.bmp");
  if (!raw) return [];
  const index = JSON.parse(raw);
  const modules = new Map();
  for (const [name, item] of Object.entries(index.modules)) {
    if (!/^(Physlib|PhyslibAlpha|QuantumInfo)(\.|$)/.test(name)) continue;
    if (item.url !== "./" + name.replaceAll(".", "/") + ".html") continue;
    modules.set(item.url, { name, url: item.url, declarations: [] });
  }
  for (const [name, { docLink, kind }] of Object.entries(index.declarations)) {
    const split = docLink.indexOf("#");
    if (split < 0) continue;
    const module = modules.get(docLink.slice(0, split));
    if (module) module.declarations.push({ name, kind, anchor: docLink.slice(split + 1) });
  }
  return [...modules.values()];
}

const modules = await libraryModules();
const rows = [];
for (let i = 0; i < modules.length; i += 16) {
  for (const group of await Promise.all(modules.slice(i, i + 16).map(moduleEntries))) rows.push(...group);
}
await writeFile(output, JSON.stringify(rows) + "\n");
console.log(`Wrote ${rows.length} Lean search entries.`);
