#!/usr/bin/env node
/*
 * Generate the reference library for the References page.
 *
 * Physlib follows Mathlib's citation convention: a central bibliography at
 * `docs/references.bib`, and per-file `## References` doc-comment sections
 * that cite entries as `[Author, *Title*][bibkey]`. This script walks a
 * clone of leanprover-community/physlib, parses the bib file, finds every
 * `[...][bibkey]` citation in every `.lean` file, and writes the merged
 * result to data/References.json.
 *
 * Same rationale as generate-api-map.js for doing this from a local clone
 * rather than at request time: there's no API that lists "every citation in
 * the repo" apart from walking the tree, and it reuses the same
 * .cache/physlib.git bare clone the other generators already keep around.
 *
 * Usage:
 *   node scripts/generate-references.js
 *   node scripts/generate-references.js --repo <path>   # reuse an existing clone
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const OWNER = "leanprover-community";
const REPO = "physlib";
const CLONE_URL = `https://github.com/${OWNER}/${REPO}.git`;
const CACHE_REPO = path.join(__dirname, "..", ".cache", "physlib.git");
const OUT_PATH = path.join(__dirname, "..", "data", "References.json");
const BIB_PATH = "docs/references.bib";

const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const repoArg = argValue("--repo") || process.env.PHYSLIB_REPO || "";

// ─── Local git (same approach as generate-api-map.js) ──────────────────────
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

// ─── Minimal BibTeX parser ──────────────────────────────────────────────────
// Handles exactly what docs/references.bib uses: @Type{ key, field = "...",
// field = {...}, ... }, with values possibly wrapped over several lines and
// braces nested inside a value (e.g. `title = "{A nu supersymmetric...}"`).
// Not a general-purpose parser - just enough for this one file's dialect.

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let inQuote = false;
  let cur = "";
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"' && str[i - 1] !== "\\") inQuote = !inQuote;
    if (!inQuote) {
      if (c === "{") depth++;
      else if (c === "}") depth--;
    }
    if (c === sep && depth === 0 && !inQuote) {
      parts.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function stripValue(raw) {
  let value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  else if (value.startsWith("{") && value.endsWith("}")) value = value.slice(1, -1);
  value = value.replace(/\s+/g, " ").trim();
  value = value.replace(/[{}]/g, "");
  value = value.replace(/\\"/g, '"');
  return value;
}

function parseBibtex(text) {
  const entries = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "@") {
      const headerMatch = /^@(\w+)\s*\{/.exec(text.slice(i));
      if (headerMatch) {
        const type = headerMatch[1];
        const start = i + headerMatch[0].length;
        let depth = 1;
        let j = start;
        while (j < text.length && depth > 0) {
          if (text[j] === "{") depth++;
          else if (text[j] === "}") depth--;
          j++;
        }
        const body = text.slice(start, j - 1);
        const firstComma = body.indexOf(",");
        const key = (firstComma === -1 ? body : body.slice(0, firstComma)).trim();
        const rest = firstComma === -1 ? "" : body.slice(firstComma + 1);
        const fields = {};
        for (const part of splitTopLevel(rest, ",")) {
          const eq = part.indexOf("=");
          if (eq === -1) continue;
          const name = part.slice(0, eq).trim().toLowerCase();
          fields[name] = stripValue(part.slice(eq + 1));
        }
        entries.push({ type, key, fields });
        i = j;
        continue;
      }
    }
    i++;
  }
  return entries;
}

function parseAuthors(fields) {
  if (fields.collaboration) return [fields.collaboration];
  if (!fields.author) return [];
  return fields.author.split(/\s+and\s+/).map((a) => a.trim()).filter(Boolean);
}

function authorDisplayName(author) {
  const comma = author.indexOf(",");
  if (comma === -1) return author;
  const last = author.slice(0, comma).trim();
  const first = author.slice(comma + 1).trim();
  return first ? `${first} ${last}` : last;
}

function authorSortKey(author) {
  const comma = author.indexOf(",");
  return (comma === -1 ? author : author.slice(0, comma)).trim().toLowerCase();
}

function bibEntryUrl(fields) {
  if (fields.eprint && fields.archiveprefix && fields.archiveprefix.toLowerCase() === "arxiv") {
    return `https://arxiv.org/abs/${fields.eprint}`;
  }
  if (fields.doi) return `https://doi.org/${fields.doi}`;
  if (fields.eprint) return `https://arxiv.org/abs/${fields.eprint}`;
  return null;
}

function bibEntryVenue(fields) {
  if (fields.journal) {
    const parts = [fields.journal];
    if (fields.volume) parts.push(fields.volume);
    if (fields.number) parts.push(`no. ${fields.number}`);
    if (fields.pages) parts.push(`pp. ${fields.pages}`);
    if (fields.year) parts.push(`(${fields.year})`);
    return parts.join(" ");
  }
  if (fields.publisher) {
    const parts = [fields.publisher];
    if (fields.series) parts.push(fields.series);
    if (fields.year) parts.push(`(${fields.year})`);
    return parts.join(", ");
  }
  return fields.year || "";
}

// ─── Citation scanning ──────────────────────────────────────────────────────
// Physlib's citation tag, exactly as scripts/check_references.py validates it:
// a `[ref: <bibkey>]` tag inside a module's `## References` doc-comment
// section, resolving to an entry in docs/references.bib.
const CITATION_RE = /\[ref:\s*([^\]]+?)\]/g;

function subfolderOf(file) {
  const parts = file.split("/");
  return parts.length >= 2 ? parts.slice(0, 2).join("/") : parts[0];
}

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

// ─── Main ───────────────────────────────────────────────────────────────────
(function main() {
  ensureRepo();
  const branch = resolveBranchRef();
  console.log(`• reading references from ${OWNER}/${REPO}@${branch.name}`);

  let bibText = "";
  try {
    bibText = git(["show", `${branch.rev}:${BIB_PATH}`]);
  } catch {
    console.warn(`  ⚠ could not read ${BIB_PATH}; continuing with no bibliography`);
  }
  const bibEntries = parseBibtex(bibText);
  const bibByKey = new Map(bibEntries.map((e) => [e.key, e]));

  const files = git(["ls-tree", "-r", branch.rev, "--name-only"])
    .split("\n")
    .filter((f) => f.toLowerCase().endsWith(".lean"));

  const citationsByKey = new Map();
  for (const file of files) {
    const raw = git(["show", `${branch.rev}:${file}`]);
    let match;
    CITATION_RE.lastIndex = 0;
    while ((match = CITATION_RE.exec(raw))) {
      const key = match[1].trim();
      const list = citationsByKey.get(key) ?? [];
      list.push({
        file,
        line: lineNumberAt(raw, match.index),
        subfolder: subfolderOf(file),
        url: `https://github.com/${OWNER}/${REPO}/blob/${branch.name}/${file}#L${lineNumberAt(raw, match.index)}`,
      });
      citationsByKey.set(key, list);
    }
  }

  const allKeys = new Set([...bibByKey.keys(), ...citationsByKey.keys()]);
  const references = [...allKeys].map((key) => {
    const bib = bibByKey.get(key) ?? null;
    const citations = (citationsByKey.get(key) ?? []).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    const authors = bib ? parseAuthors(bib.fields) : [];
    return {
      key,
      inBib: !!bib,
      type: bib ? bib.type : null,
      authors: authors.map(authorDisplayName),
      authorSortKey: authors.length ? authorSortKey(authors[0]) : key.toLowerCase(),
      title: bib ? bib.fields.title || null : null,
      year: bib ? bib.fields.year || null : null,
      venue: bib ? bibEntryVenue(bib.fields) : "",
      url: bib ? bibEntryUrl(bib.fields) : null,
      citations,
      count: citations.length,
    };
  });

  references.sort((a, b) => a.key.localeCompare(b.key));

  const out = {
    repo: `${OWNER}/${REPO}`,
    branch: branch.name,
    generatedAt: new Date().toISOString(),
    references,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  const cited = references.filter((r) => r.count > 0).length;
  const missingBib = references.filter((r) => !r.inBib).length;
  console.log(
    `• wrote ${references.length} references (${cited} cited, ${missingBib} missing a bib entry) → ${path.relative(process.cwd(), OUT_PATH)}`,
  );
})();
