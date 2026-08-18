#!/usr/bin/env node
/*
 * Generate the API dependency graph for the API Tracker page.
 *
 * Physlib records the design status of each API in an `API-map.yaml` file
 * next to it (Title, ParentAPIs, Requirements with done/location, ...). This
 * script walks a clone of leanprover-community/physlib for every such file,
 * parses it, and writes the resulting graph to data/APIMap.json.
 *
 * Why not fetch this at request time (as the page used to, from GitHub
 * issues): there is no API that lists "every API-map.yaml in the repo" apart
 * from walking the git tree, and doing that from the browser on every page
 * load would mean dozens of raw-content fetches against GitHub's anonymous
 * rate limit. A local clone makes it one `ls-tree` plus one `show` per file,
 * and reuses the same .cache/physlib.git clone the monthly-updates generator
 * already keeps around.
 *
 * Usage:
 *   node scripts/generate-api-map.js
 *   node scripts/generate-api-map.js --repo <path>   # reuse an existing clone
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const yaml = require("js-yaml");

const OWNER = "leanprover-community";
const REPO = "physlib";
const CLONE_URL = `https://github.com/${OWNER}/${REPO}.git`;
const CACHE_REPO = path.join(__dirname, "..", ".cache", "physlib.git");
const OUT_PATH = path.join(__dirname, "..", "data", "APIMap.json");
const FILE_NAME = "API-map.yaml";

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

// ─── ParentAPIs parsing ─────────────────────────────────────────────────────
// Each entry is normally "Name (path/to/parent)". Some entries are a bare
// path with no name (e.g. "Physlib/Relativity/MinkowskiMatrix.lean") - fall
// back to the path's basename as the display name for those.
function parseParentEntry(entry) {
  const trimmed = String(entry).trim();
  const match = trimmed.match(/^(.*)\s\(([^()]+)\)$/);
  if (match) {
    return { name: match[1].trim(), path: match[2].trim() };
  }
  const base = trimmed.split("/").pop().replace(/\.lean$/i, "");
  return { name: base, path: trimmed };
}

// ─── Main ───────────────────────────────────────────────────────────────────
(function main() {
  ensureRepo();
  const branch = resolveBranchRef();
  console.log(`• reading API-map.yaml files from ${OWNER}/${REPO}@${branch.name}`);

  const files = git(["ls-tree", "-r", branch.rev, "--name-only"])
    .split("\n")
    .filter((f) => f.toLowerCase().endsWith(`/${FILE_NAME.toLowerCase()}`) || f.toLowerCase() === FILE_NAME.toLowerCase());

  const nodes = [];
  for (const file of files) {
    const raw = git(["show", `${branch.rev}:${file}`]);
    let doc;
    try {
      doc = yaml.load(raw);
    } catch (err) {
      console.warn(`  ⚠ skipping ${file}: ${err.message}`);
      continue;
    }
    if (!doc || typeof doc !== "object") {
      console.warn(`  ⚠ skipping ${file}: empty or invalid document`);
      continue;
    }

    const dir = file.slice(0, file.length - FILE_NAME.length - 1);
    const requirements = (Array.isArray(doc.Requirements) ? doc.Requirements : []).map((r) => ({
      description: r && r.description ? String(r.description).trim() : "",
      done: !!(r && r.done === true),
      location: r && r.location ? String(r.location).trim() : "N/A",
    }));
    const references = (Array.isArray(doc.References) ? doc.References : [])
      .map((r) => String(r).trim())
      .filter(Boolean);
    const parents = (Array.isArray(doc.ParentAPIs) ? doc.ParentAPIs : []).map(parseParentEntry);

    nodes.push({
      path: dir,
      title: doc.Title ? String(doc.Title).trim() : dir,
      overview: doc.Overview ? String(doc.Overview).trim() : "",
      references,
      requirements,
      parents,
      url: `https://github.com/${OWNER}/${REPO}/blob/${branch.name}/${file}`,
    });
  }

  nodes.sort((a, b) => a.path.localeCompare(b.path));

  const out = {
    repo: `${OWNER}/${REPO}`,
    branch: branch.name,
    generatedAt: new Date().toISOString(),
    nodes,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`• wrote ${nodes.length} API nodes → ${path.relative(process.cwd(), OUT_PATH)}`);
})();
