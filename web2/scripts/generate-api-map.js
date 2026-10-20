#!/usr/bin/env node
/*
 * Generate the API map data for the API Tracker page.
 *
 * Physlib documents each API in an `API-map.md` file next to it - a prose
 * article with a fixed shape (see docs/API_MAP_GUIDE.md in Physlib):
 *
 *   # Title
 *   ## Abstract            (or ## Abstract (Alpha)) - one paragraph
 *   ## Content             (and/or ## Content (Alpha)) - prose, with ### subsections
 *   ## Lean References     - `n. File.lean — `decl`, `decl``, cited as [n]
 *   ## References          - literature and other API maps, cited as {n}
 *
 * Claims in the content end in runs of `[n]` citations, or `[TODO]` when not
 * yet formalized. This script walks a clone of leanprover-community/physlib
 * for every such file, splits it into those sections, resolves each cited
 * declaration to its fully-qualified name (so the page can link straight to
 * its doc-gen4 entry and source line), and writes data/APIMap.json.
 *
 * The section texts are kept verbatim, not pre-rendered: the page renders
 * them itself, and its "edit" view loads exactly that text for the reader to
 * change.
 *
 * Why not fetch this at request time: there is no API that lists "every
 * API-map.md in the repo" apart from walking the git tree, and doing that from
 * the browser on every page load would mean dozens of raw-content fetches
 * against GitHub's anonymous rate limit. A local clone makes it one `ls-tree`
 * plus one `show` per file, and reuses the same .cache/physlib.git clone the
 * monthly-updates generator already keeps around.
 *
 * Usage:
 *   node scripts/generate-api-map.js
 *   node scripts/generate-api-map.js --repo <path>   # reuse an existing clone
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { parseLean } = require("./lean-decls");

const OWNER = "leanprover-community";
const REPO = "physlib";
const CLONE_URL = `https://github.com/${OWNER}/${REPO}.git`;
const CACHE_REPO = path.join(__dirname, "..", ".cache", "physlib.git");
const OUT_PATH = path.join(__dirname, "..", "data", "APIMap.json");
const FILE_NAME = "API-map.md";

const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const repoArg = argValue("--repo") || process.env.PHYSLIB_REPO || "";

// ─── Local git (same approach as generate-monthly-updates.js) ─────────────
let REPO_DIR = "";

function git(gitArgs) {
  return execFileSync("git", ["-C", REPO_DIR, ...gitArgs], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
}

function ensureRepo() {
  if (repoArg) {
    REPO_DIR = path.resolve(repoArg);
    if (!fs.existsSync(path.join(REPO_DIR, ".git")) && !fs.existsSync(path.join(REPO_DIR, "HEAD"))) {
      throw new Error(`--repo ${REPO_DIR} is not a git repository`);
    }
    console.log(`• using existing clone at ${REPO_DIR}`);
  } else {
    REPO_DIR = CACHE_REPO;
    if (!fs.existsSync(REPO_DIR)) {
      console.log(`• cloning ${CLONE_URL} → ${path.relative(process.cwd(), REPO_DIR)} (once)`);
      fs.mkdirSync(path.dirname(REPO_DIR), { recursive: true });
      execFileSync("git", ["clone", "--bare", CLONE_URL, REPO_DIR], { stdio: "inherit" });
    }
  }
  try {
    git(["fetch", "--quiet", "origin", "+refs/heads/*:refs/remotes/origin/*", "--tags"]);
  } catch {
    try {
      git(["fetch", "--quiet", "--all"]);
    } catch {
      console.warn("  ⚠ could not fetch; working from whatever the clone already has");
    }
  }
}

function resolveBranchRef() {
  const candidates = [];
  try {
    const remotes = git(["remote", "-v"])
      .split("\n")
      .filter(Boolean)
      .map((l) => l.split(/\s+/))
      .filter(([, url]) => url && new RegExp(`[/:]${OWNER}/${REPO}(\\.git)?$`, "i").test(url))
      .map(([name]) => name);
    for (const r of [...new Set(remotes)]) {
      candidates.push({ rev: `${r}/master`, name: "master" });
      candidates.push({ rev: `${r}/main`, name: "main" });
    }
  } catch {
    /* fall through to the generic candidates */
  }
  candidates.push(
    { rev: "origin/master", name: "master" },
    { rev: "origin/main", name: "main" },
    { rev: "master", name: "master" },
    { rev: "main", name: "main" },
  );
  for (const candidate of candidates) {
    try {
      git(["rev-parse", "--verify", "--quiet", candidate.rev]);
      return candidate;
    } catch {
      /* try next */
    }
  }
  throw new Error(`could not resolve ${OWNER}/${REPO}'s default branch in ${REPO_DIR}`);
}

// ─── API-map.md parsing ─────────────────────────────────────────────────────
// Mirrors Physlib's own reader (scripts/alpha/website/APIMapIndex.lean): line
// based and graceful - anything that doesn't fit the expected shape is left
// out rather than failing the whole run.

/** Splits a file into its `## ` sections, keeping each body verbatim. */
function splitSections(lines) {
  let title = "";
  const sections = [];
  let current = null;
  lines.forEach((line, i) => {
    if (!title && /^# /.test(line)) {
      title = line.slice(2).trim();
      return;
    }
    if (/^## /.test(line)) {
      current = { heading: line.slice(3).trim(), start: i, body: [] };
      sections.push(current);
      return;
    }
    if (current) current.body.push(line);
  });
  return { title, sections };
}

const trimBlock = (lines) => lines.join("\n").trim();

/** A content section's text before its first `### `, then one entry per
 *  `### ` subsection. */
function splitSubsections(bodyLines) {
  const intro = [];
  const subsections = [];
  let current = null;
  for (const line of bodyLines) {
    if (/^### /.test(line)) {
      current = { title: line.slice(4).trim(), body: [] };
      subsections.push(current);
    } else if (current) {
      current.body.push(line);
    } else {
      intro.push(line);
    }
  }
  return {
    intro: trimBlock(intro),
    subsections: subsections.map((s) => ({ title: s.title, body: trimBlock(s.body) })),
  };
}

/** A numbered markdown list (`1. ...`), with wrapped continuation lines
 *  joined back onto the entry they continue. */
function numberedEntries(bodyLines) {
  const entries = [];
  for (const raw of bodyLines) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\.\s+(.*)$/);
    if (m) entries.push({ index: Number(m[1]), text: m[2] });
    else if (entries.length) entries[entries.length - 1].text += " " + line;
  }
  return entries;
}

const backticked = (text) => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());

/** `File.lean — `a`, `b`` → { file, declarations: ["a", "b"] }. */
function parseLeanReference({ index, text }) {
  const dash = text.indexOf("—");
  const file = (dash >= 0 ? text.slice(0, dash) : text).trim();
  const rest = dash >= 0 ? text.slice(dash + 1) : "";
  return { index, file, declarations: backticked(rest) };
}

const API_MAP_PATH_RE = /((?:Physlib|PhyslibAlpha|QuantumInfo)\/[^\s,;)]*?)\/API-map\.md/;

/** A literature entry, noting the API map it points at when it is one. */
function parseLiteratureReference({ index, text }) {
  const m = text.match(API_MAP_PATH_RE);
  return { index, text, apiMap: m ? m[1] : null };
}

/** The claims of the content, exactly as Physlib's index counts them: each
 *  run of adjacent `[n]`/`[TODO]` citations closes a claim, done unless the
 *  run contains `[TODO]`. Literature citations `{n}` don't count. */
function claimsOf(paragraph, alpha) {
  const text = paragraph.replace(/\{\s*\d+\s*\}/g, "");
  const claims = [];
  let run = null;
  let last = 0;
  for (const m of text.matchAll(/\[(TODO|\d+(?:\s*,\s*\d+)*)\]/g)) {
    // Prose between two citations ends the earlier run's claim.
    if (run && text.slice(last, m.index).trim()) {
      claims.push(run);
      run = null;
    }
    run ??= { done: true, citations: [], alpha };
    if (m[1] === "TODO") run.done = false;
    else run.citations.push(...m[1].split(",").map((n) => Number(n.trim())));
    last = m.index + m[0].length;
  }
  if (run) claims.push(run);
  return claims;
}

const paragraphsOf = (text) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").filter((l) => !/^#/.test(l)).join(" ").trim())
    .filter(Boolean);

// ─── Declaration resolution ────────────────────────────────────────────────
const leanFileCache = new Map();

/** Fully-qualified name → declaration, for one Lean file at `rev`. Null when
 *  the file does not exist there. */
function declarationsIn(rev, file) {
  if (leanFileCache.has(file)) return leanFileCache.get(file);
  let decls = null;
  try {
    decls = parseLean(git(["show", `${rev}:${file}`]));
  } catch {
    decls = null;
  }
  leanFileCache.set(file, decls);
  return decls;
}

/** The first paragraph of a docstring, capped - enough for a hover preview. */
function shortDoc(doc) {
  if (!doc) return null;
  const first = doc.trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ");
  return first.length > 400 ? first.slice(0, 397) + "…" : first;
}

function shortSignature(signature) {
  if (!signature) return null;
  const lines = signature.split("\n").filter((l) => !/^\s*@\[/.test(l));
  const joined = lines.join("\n").trim();
  return joined.length > 240 ? joined.slice(0, 239) + "…" : joined;
}

/**
 * Resolves one cited declaration against the file it is cited in. The map
 * names declarations as they read in the source, which may drop the
 * namespace (`deriv_smul` for `Time.deriv_smul`), so a suffix match counts;
 * the shortest such name wins. Notations and instance types (a class applied
 * to arguments) aren't named declarations and are only labelled.
 */
function resolveDeclaration(text, decls) {
  if (/^notation\s/.test(text)) return { text, kind: "notation" };
  const name = text.split(" : ")[0].trim();
  if (/\s/.test(name)) return { text, kind: "instance" };
  if (!/[A-Za-z]/.test(name)) return { text, kind: "notation" };
  if (!decls) return { text };
  let match = decls.get(name) ?? null;
  if (!match) {
    const candidates = [...decls.values()].filter((d) => d.name.endsWith("." + name));
    candidates.sort((a, b) => a.name.length - b.name.length);
    match = candidates[0] ?? null;
  }
  if (!match) return { text };
  return {
    text,
    fullName: match.name,
    kind: match.kind,
    line: match.line,
    doc: shortDoc(match.doc),
    signature: shortSignature(match.signature),
  };
}

/** Reads one `API-map.md`. */
function parseApiMap(raw, file, rev, branchName, existingFiles) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const { title, sections } = splitSections(lines);
  const dir = file.slice(0, file.length - FILE_NAME.length - 1);

  const abstractSection = sections.find((s) => /^Abstract( \(Alpha\))?$/.test(s.heading));
  const contentSections = sections.filter((s) => /^Content( \(Alpha\))?$/.test(s.heading));
  const leanSection = sections.find((s) => s.heading === "Lean References");
  const litSection = sections.find((s) => s.heading === "References");

  const content = contentSections.map((s) => ({
    heading: s.heading,
    alpha: s.heading.endsWith("(Alpha)"),
    ...splitSubsections(s.body),
  }));

  const leanReferences = (leanSection ? numberedEntries(leanSection.body) : [])
    .map(parseLeanReference)
    .map((ref) => {
      const exists = existingFiles.has(ref.file);
      const decls = exists ? declarationsIn(rev, ref.file) : null;
      return {
        ...ref,
        exists,
        declarations: ref.declarations.map((d) => resolveDeclaration(d, decls)),
      };
    });

  const references = (litSection ? numberedEntries(litSection.body) : []).map(parseLiteratureReference);

  const requirements = contentSections.flatMap((s) =>
    paragraphsOf(s.body.join("\n")).flatMap((p) => claimsOf(p, s.heading.endsWith("(Alpha)"))),
  );

  // Another API map cited in the references is what this one builds on - the
  // edges of the dependency map.
  const parents = [];
  for (const ref of references) {
    if (!ref.apiMap || ref.apiMap === dir || parents.some((p) => p.path === ref.apiMap)) continue;
    const name = ref.text.split("—")[0].replace(/\s*API map\s*$/i, "").trim();
    parents.push({ name: name || ref.apiMap.split("/").pop(), path: ref.apiMap });
  }

  return {
    path: dir,
    file,
    title: title || dir,
    alpha: abstractSection ? abstractSection.heading.endsWith("(Alpha)") : true,
    abstract: abstractSection ? trimBlock(abstractSection.body) : "",
    abstractHeading: abstractSection ? abstractSection.heading : "Abstract",
    content,
    leanReferences,
    references,
    requirements,
    parents,
    url: `https://github.com/${OWNER}/${REPO}/blob/${branchName}/${file}`,
  };
}

// ─── Directories ─────────────────────────────────────────────────────────────
const LIBRARY_ROOTS = ["Physlib", "PhyslibAlpha", "QuantumInfo"];

/**
 * Every directory of the three libraries that holds Lean files (directly or
 * below it), with how many and whether it already has an API map - what the
 * "create an API map" page offers as places a new map could go.
 */
function leanDirectories(allFiles) {
  const counts = new Map();
  for (const f of allFiles) {
    if (!f.endsWith(".lean") || !LIBRARY_ROOTS.includes(f.split("/")[0])) continue;
    const parts = f.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join("/");
      counts.set(dir, (counts.get(dir) ?? 0) + 1);
    }
  }
  const mapped = new Set(
    allFiles.filter((f) => f.endsWith(`/${FILE_NAME}`)).map((f) => f.slice(0, -FILE_NAME.length - 1)),
  );
  return [...counts]
    .map(([path, leanFiles]) => ({ path, leanFiles, hasApiMap: mapped.has(path) }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

// ─── Main ───────────────────────────────────────────────────────────────────
(function main() {
  ensureRepo();
  const branch = resolveBranchRef();
  console.log(`• reading ${FILE_NAME} files from ${OWNER}/${REPO}@${branch.name}`);

  const allFiles = git(["ls-tree", "-r", branch.rev, "--name-only"]).split("\n").filter(Boolean);
  const existingFiles = new Set(allFiles);
  const files = allFiles.filter(
    (f) => f.endsWith(`/${FILE_NAME}`) || f === FILE_NAME,
  );

  const nodes = [];
  for (const file of files) {
    const raw = git(["show", `${branch.rev}:${file}`]);
    try {
      nodes.push(parseApiMap(raw, file, branch.rev, branch.name, existingFiles));
    } catch (err) {
      console.warn(`  ⚠ skipping ${file}: ${err.message}`);
    }
  }

  nodes.sort((a, b) => a.path.localeCompare(b.path));

  const out = {
    repo: `${OWNER}/${REPO}`,
    branch: branch.name,
    // The commit the maps were read at - the base an edit suggested on the
    // site applies to (see src/lib/api-map-issue.ts).
    commit: git(["rev-parse", branch.rev]).trim(),
    generatedAt: new Date().toISOString(),
    nodes,
    directories: leanDirectories(allFiles),
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  const decls = nodes.flatMap((n) => n.leanReferences.flatMap((r) => r.declarations));
  const resolved = decls.filter((d) => d.fullName).length;
  console.log(
    `• wrote ${nodes.length} API maps (${resolved}/${decls.length} cited declarations resolved) → ${path.relative(process.cwd(), OUT_PATH)}`,
  );
})();
