#!/usr/bin/env node
/*
 * Generate the growth series behind the charts on the sponsor page.
 *
 * For every month since Physlib started, this records:
 *
 *   - lines of Lean, and `theorem`/`lemma` declarations, in the reviewed
 *     libraries (Physlib and QuantumInfo, and their earlier names PhysLean
 *     and HepLean), read from the last commit on the default branch in that
 *     month. PhyslibAlpha is left out: it is reviewed more lightly.
 *   - pull requests proposed that month, and in total;
 *   - contributors: distinct people (bots excluded) with at least one merged
 *     pull request by the end of the month;
 *   - GitHub stars by the end of the month.
 *
 * Code size comes from git (the same .cache/physlib.git clone the other
 * generators use); pull requests and stars come from the GitHub API, since
 * neither is recorded in git. The output, data/Growth.json, also records the
 * commit each month was measured at, so every number can be checked.
 *
 * Auth: GITHUB_TOKEN (or GH_TOKEN) is optional but recommended. The run makes
 * about 35 API requests, which fits the anonymous limit of 60 an hour, but
 * only just.
 *
 * Usage:
 *   node scripts/generate-growth.js
 *   node scripts/generate-growth.js --repo <path>   # reuse an existing clone
 */

const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");
const { execFileSync } = require("node:child_process");

const OWNER = "leanprover-community";
const REPO = "physlib";
const CLONE_URL = `https://github.com/${OWNER}/${REPO}.git`;
const CACHE_REPO = path.join(__dirname, "..", ".cache", "physlib.git");
const OUT_PATH = path.join(__dirname, "..", "data", "Growth.json");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

/** The reviewed libraries, under every name they have had. */
const LIBRARY_PATHS = ["Physlib", "QuantumInfo", "PhysLean", "HepLean"].map((d) => `${d}/*.lean`);

/** A `theorem` or `lemma` declaration, allowing attributes and modifiers before it. */
const DECLARATION =
  "^\\s*(@\\[[^\\]]*\\]\\s*)?((private|protected|noncomputable|nonrec)\\s+)*(theorem|lemma)\\s";

const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const repoArg = argValue("--repo") || process.env.PHYSLIB_REPO || "";

// ─── Local git (same approach as generate-api-map.js) ──────────────────────
let REPO_DIR = "";

function git(gitArgs, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", ["-C", REPO_DIR, ...gitArgs], {
      encoding: "utf8",
      maxBuffer: 1 << 28,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    // `git grep` exits 1 when nothing matches, which for us just means zero.
    if (allowFailure && error.status === 1) return "";
    throw error;
  }
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
  } catch (error) {
    if (process.env.GITHUB_ACTIONS === "true") throw error;
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

/** Sums the per-file counts that `git grep -c` prints as `rev:path:count`. */
function grepCount(rev, pattern, extraArgs = []) {
  const out = git(["grep", "-c", ...extraArgs, "-e", pattern, rev, "--", ...LIBRARY_PATHS], {
    allowFailure: true,
  });
  let total = 0;
  for (const line of out.split("\n")) {
    const n = Number(line.slice(line.lastIndexOf(":") + 1));
    if (line && Number.isFinite(n)) total += n;
  }
  return total;
}

// ─── GitHub API ────────────────────────────────────────────────────────────
function ghGet(pathAndQuery, accept = "application/vnd.github+json") {
  const headers = {
    "User-Agent": "physlib-growth",
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: "api.github.com", path: pathAndQuery, method: "GET", headers }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if ((res.statusCode ?? 0) >= 400) {
          reject(new Error(`GitHub ${res.statusCode} for ${pathAndQuery}: ${body.slice(0, 200)}`));
        } else {
          resolve(JSON.parse(body));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/** Every page of a list endpoint. */
async function ghAll(endpoint, accept) {
  const items = [];
  for (let page = 1; ; page++) {
    const sep = endpoint.includes("?") ? "&" : "?";
    const batch = await ghGet(`${endpoint}${sep}per_page=100&page=${page}`, accept);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
}

// ─── Months ────────────────────────────────────────────────────────────────
const monthKey = (iso) => iso.slice(0, 7);

/** "2024-04" … the current month, inclusive. */
function monthsBetween(first, last) {
  const out = [];
  let [y, m] = first.split("-").map(Number);
  const [ly, lm] = last.split("-").map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** The last day of a month, as YYYY-MM-DD. */
function monthEnd(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

/** Running count of the items whose month is at or before each month. */
function cumulative(months, itemMonths) {
  const perMonth = new Map();
  for (const m of itemMonths) perMonth.set(m, (perMonth.get(m) ?? 0) + 1);
  let running = 0;
  for (const m of [...perMonth.keys()].sort()) if (m < months[0]) running += perMonth.get(m);
  return months.map((m) => (running += perMonth.get(m) ?? 0));
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  if (!TOKEN) console.warn("⚠ GITHUB_TOKEN is not set; using the anonymous rate limit.");
  ensureRepo();
  const branch = resolveBranchRef();
  const headSha = git(["rev-parse", branch.rev]).trim();
  const headDate = git(["show", "-s", "--format=%cI", headSha]).trim();
  const firstDate = git(["log", "--first-parent", "--reverse", "--format=%cI", branch.rev]).split("\n")[0];
  const months = monthsBetween(monthKey(firstDate), monthKey(headDate));
  console.log(`• ${months.length} months, ${months[0]} to ${months.at(-1)}, head ${headSha.slice(0, 9)}`);

  // Code size at the last commit of each month on the default branch.
  const code = months.map((month) => {
    const sha = git(["rev-list", "-1", "--first-parent", `--before=${monthEnd(month)}T23:59:59Z`, branch.rev]).trim();
    return { sha, lines: grepCount(sha, ""), theorems: grepCount(sha, DECLARATION, ["-P"]) };
  });
  console.log(`• measured code size (now ${code.at(-1).lines} lines, ${code.at(-1).theorems} theorems and lemmas)`);

  const prs = await ghAll(`/repos/${OWNER}/${REPO}/pulls?state=all`);
  const stars = await ghAll(`/repos/${OWNER}/${REPO}/stargazers`, "application/vnd.github.star+json");
  console.log(`• fetched ${prs.length} pull requests and ${stars.length} stars`);

  const proposedTotal = cumulative(months, prs.map((p) => monthKey(p.created_at)));
  const starsTotal = cumulative(months, stars.map((s) => monthKey(s.starred_at)));

  // A contributor counts from the month of their first merged pull request.
  const firstMerge = new Map();
  for (const p of prs) {
    if (!p.merged_at || p.user?.type !== "User") continue;
    const m = monthKey(p.merged_at);
    const login = p.user.login;
    if (!firstMerge.has(login) || m < firstMerge.get(login)) firstMerge.set(login, m);
  }
  const contributorsTotal = cumulative(months, [...firstMerge.values()]);

  const series = months.map((month, i) => ({
    month,
    sha: code[i].sha,
    lines: code[i].lines,
    theorems: code[i].theorems,
    pullRequests: proposedTotal[i] - (i > 0 ? proposedTotal[i - 1] : 0),
    pullRequestsTotal: proposedTotal[i],
    contributors: contributorsTotal[i],
    stars: starsTotal[i],
  }));

  const out = {
    generatedAt: new Date().toISOString(),
    repo: `${OWNER}/${REPO}`,
    branch: branch.name,
    headSha,
    headDate,
    libraries: ["Physlib", "QuantumInfo"],
    series,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  console.log(`✓ wrote ${path.relative(process.cwd(), OUT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
