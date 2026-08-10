#!/usr/bin/env node
/*
 * Generate a monthly update report for the leanprover-community/physlib repo.
 *
 * For a given month (default: the previous UTC month, i.e. the standard
 * "run on the 1st for the last month" case) this script:
 *   1. Finds the first-parent commit of the default branch at the start of the
 *      month and at the start of the following month.
 *   2. Diffs those two commits with local git to get exact per-file line
 *      counts and the list of changed .lean files (with rename detection).
 *   3. Determines which declarations are *new* by parsing each changed .lean
 *      file in full at both commits and set-differencing by fully-qualified
 *      name (see scripts/lean-decls.js).
 *   4. Writes the result to data/monthly-updates/<YYYY-MM>.json.
 *
 * Why local git and not GitHub's compare API: /compare caps its `files` array
 * at 300 entries and omits `patch` entirely on large files. On a busy month
 * both limits hit at once, and there is no truncation flag to detect it - the
 * report just silently under-reports. A local clone has neither limit.
 *
 * Usage:
 *   node scripts/generate-monthly-updates.js                 # last month
 *   node scripts/generate-monthly-updates.js --month 2026-06 # specific month
 *   node scripts/generate-monthly-updates.js --backfill 6    # last 6 months
 *   node scripts/generate-monthly-updates.js --force         # overwrite existing
 *   node scripts/generate-monthly-updates.js --no-pdf        # skip PDF compile
 *   node scripts/generate-monthly-updates.js --repo <path>   # reuse a clone
 *
 * Repo: needs a clone of leanprover-community/physlib. Pass --repo, or set
 * PHYSLIB_REPO, or let the script clone into .cache/physlib.git and reuse it.
 *
 * Auth: GITHUB_TOKEN is optional and used only to attach GitHub logins and
 * avatars to contributors. Commit counts and everything else come from git, so
 * the script works fully offline against an existing clone.
 *
 * PDF: after writing the JSON report the script also writes a scientific-paper
 * style LaTeX source to .monthly-updates-build/<slug>.tex and, if either
 * `tectonic` or `xelatex` is on PATH, compiles it to
 * public/monthly-updates/<slug>.pdf. Only the `.pdf` is published and
 * committed; the `.tex` is a gitignored intermediate.
 */

const https = require("node:https");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync, execFileSync } = require("node:child_process");
const { findAddedDeclarations } = require("./lean-decls");

const OWNER = "leanprover-community";
const REPO = "physlib";
const CLONE_URL = `https://github.com/${OWNER}/${REPO}.git`;
const OUT_DIR = path.join(__dirname, "..", "data", "monthly-updates");
// The .pdf is the published artifact and belongs in public/. The .tex is an
// intermediate - keep it out of public/ so it isn't served or committed.
const PDF_DIR = path.join(__dirname, "..", "public", "monthly-updates");
const TEX_DIR = path.join(__dirname, "..", ".monthly-updates-build");
const CACHE_REPO = path.join(__dirname, "..", ".cache", "physlib.git");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

// ─── CLI ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const flagForce = args.includes("--force");
const flagNoPdf = args.includes("--no-pdf");
const monthArg = argValue("--month");
const backfillArg = argValue("--backfill");
const repoArg = argValue("--repo") || process.env.PHYSLIB_REPO || "";

// ─── HTTP helpers ─────────────────────────────────────────────────────────
function ghRequest(pathAndQuery) {
  const options = {
    hostname: "api.github.com",
    path: pathAndQuery,
    method: "GET",
    headers: {
      "User-Agent": "physlib-monthly-updates",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  };
  if (TOKEN) options.headers.Authorization = `Bearer ${TOKEN}`;

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode && res.statusCode >= 400) {
          reject(
            new Error(
              `GitHub API ${res.statusCode} on ${pathAndQuery}: ${body.slice(0, 300)}`,
            ),
          );
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error(`Invalid JSON from ${pathAndQuery}: ${err.message}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ─── Date helpers ─────────────────────────────────────────────────────────
function monthBoundsUTC(year, monthIdx /* 0-based */) {
  const start = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIdx + 1, 1, 0, 0, 0));
  return { start, end };
}
function prevMonthUTC(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() - 1;
  const d = new Date(Date.UTC(y, m, 1));
  return { year: d.getUTCFullYear(), monthIdx: d.getUTCMonth() };
}
function formatMonthSlug(year, monthIdx) {
  return `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
}
function formatMonthLabel(year, monthIdx) {
  return new Date(Date.UTC(year, monthIdx, 1)).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── Local git ────────────────────────────────────────────────────────────
let REPO_DIR = "";

function git(gitArgs, opts = {}) {
  return execFileSync("git", ["-C", REPO_DIR, ...gitArgs], {
    encoding: "utf8",
    // Whole Lean files, and diffs over thousands of them, blow the 1MB default.
    maxBuffer: 1 << 28,
    ...opts,
  });
}

/** Ensure a usable clone exists and is up to date; sets REPO_DIR. */
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
      // A bare mirror is all we need - we only ever read blobs via `git show`,
      // never check anything out.
      execFileSync("git", ["clone", "--bare", CLONE_URL, REPO_DIR], {
        stdio: "inherit",
      });
    }
  }
  // Refresh so a month that just ended is actually present.
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

/**
 * The upstream default branch, as a rev this clone can resolve.
 *
 * Picks the remote whose URL actually points at OWNER/REPO rather than
 * assuming `origin`: when --repo is a *fork* of physlib, `origin` is the fork
 * and upstream is some other remote, and diffing the fork's branch would
 * report the fork's commits instead of the library's.
 */
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
      candidates.push(`${r}/master`, `${r}/main`);
    }
  } catch {
    /* fall through to the generic candidates */
  }
  candidates.push("origin/master", "origin/main", "master", "main");

  for (const candidate of candidates) {
    const res = spawnSync("git", ["-C", REPO_DIR, "rev-parse", "--verify", "--quiet", candidate]);
    if (res.status === 0) return candidate;
  }
  throw new Error(
    `could not resolve ${OWNER}/${REPO}'s default branch in ${REPO_DIR}`,
  );
}

/**
 * Latest commit on the branch's first-parent chain strictly before `iso`, or
 * null if none.
 *
 * --first-parent matters: the branch's history is not linear, so two commits
 * picked purely by date are not guaranteed to be ancestors of one another, and
 * diffing an unrelated pair pulls in parallel-branch content and wildly
 * overstates the month. The first-parent chain is a single ancestor line, so
 * any two commits on it are always comparable. Callers still assert ancestry.
 */
function commitBefore(branchRef, iso) {
  const out = git([
    "rev-list",
    "-1",
    "--first-parent",
    `--before=${iso}`,
    branchRef,
  ]).trim();
  return out || null;
}

function isAncestor(base, head) {
  const res = spawnSync("git", ["-C", REPO_DIR, "merge-base", "--is-ancestor", base, head]);
  return res.status === 0;
}

/** Per-file additions/deletions for the whole diff. No 300-file ceiling. */
function numstat(base, head) {
  const out = git(["diff", "--numstat", "-z", "--find-renames", base, head]);
  const fields = out.split("\0");
  const rows = [];
  let i = 0;
  while (i < fields.length) {
    const rec = fields[i];
    if (!rec) {
      i += 1;
      continue;
    }
    const m = rec.match(/^(\d+|-)\t(\d+|-)\t(.*)$/);
    if (!m) {
      i += 1;
      continue;
    }
    // With -z, a rename emits an empty path in the record and then two extra
    // NUL-separated fields: old path, new path.
    let filename = m[3];
    if (filename === "") {
      filename = fields[i + 2] ?? "";
      i += 3;
    } else {
      i += 1;
    }
    rows.push({
      filename,
      // "-" means binary; count it as zero lines rather than NaN.
      additions: m[1] === "-" ? 0 : parseInt(m[1], 10),
      deletions: m[2] === "-" ? 0 : parseInt(m[2], 10),
    });
  }
  return rows;
}

/**
 * Changed .lean files as { oldPath, newPath }. `oldPath` is null only for
 * genuinely new files.
 *
 * Rename detection is essential, not a nicety: physlib renamed its entire
 * source tree (PhysLean/... -> Physlib/...) in a single April 2026 commit, and
 * without --find-renames every declaration in all 400+ moved files reads as
 * brand new, because the new path simply does not exist at the base commit.
 */
function changedLeanFiles(base, head) {
  const out = git([
    "diff",
    "--name-status",
    "--find-renames",
    "-z",
    "--diff-filter=ACMR",
    base,
    head,
    "--",
    "*.lean",
  ]);
  const fields = out.split("\0");
  const pairs = [];
  let i = 0;
  while (i < fields.length) {
    const status = fields[i];
    if (!status) {
      i += 1;
      continue;
    }
    if ((status[0] === "R" || status[0] === "C") && i + 2 < fields.length) {
      pairs.push({ oldPath: fields[i + 1], newPath: fields[i + 2] });
      i += 3;
    } else if (i + 1 < fields.length) {
      const p = fields[i + 1];
      pairs.push({ oldPath: status[0] === "A" ? null : p, newPath: p });
      i += 2;
    } else {
      break;
    }
  }
  return pairs.sort((a, b) => a.newPath.localeCompare(b.newPath));
}

/** Contents of `filePath` at `sha`, or null if it didn't exist there. */
function fileAt(sha, filePath) {
  const res = spawnSync("git", ["-C", REPO_DIR, "show", `${sha}:${filePath}`], {
    encoding: "utf8",
    maxBuffer: 1 << 28,
  });
  return res.status === 0 ? res.stdout : null;
}

/** Commits in (base, head], from git - exact, and with no pagination cap. */
function commitsInRange(base, head) {
  const SEP = "\x1f";
  const out = git([
    "log",
    `${base}..${head}`,
    `--format=%H${SEP}%an${SEP}%ae`,
  ]);
  return out
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, name, email] = line.split(SEP);
      return { sha, name, email };
    });
}

/**
 * Best-effort GitHub identity lookup, used to turn git authors into linked,
 * avatared accounts. Returns { bySha, byEmail } maps of
 * { login, avatar_url, html_url }.
 *
 * Keyed primarily by commit SHA, which is an exact join against git's own
 * commit list. Email is kept only as a secondary key for commits the API's
 * date-windowed listing happens not to return: matching on email alone is
 * unreliable because squash merges and web-UI commits can record a different
 * address than the one git has locally.
 *
 * Runs without a token too - unauthenticated GitHub allows 60 requests/hour
 * and a single month needs about two - so contributor links work locally. On
 * rate-limit or any other failure we degrade to plain git names rather than
 * failing the report.
 */
async function githubIdentities(branch, sinceIso, untilIso) {
  const bySha = new Map();
  const byEmail = new Map();
  try {
    for (let page = 1; page <= 100; page++) {
      const q = new URLSearchParams({
        sha: branch.replace(/^[^/]+\//, ""),
        since: sinceIso,
        until: untilIso,
        per_page: "100",
        page: String(page),
      }).toString();
      const batch = await ghRequest(`/repos/${OWNER}/${REPO}/commits?${q}`);
      if (!Array.isArray(batch) || batch.length === 0) break;
      for (const c of batch) {
        if (!c.author?.login) continue;
        const identity = {
          login: c.author.login,
          avatar_url: c.author.avatar_url ?? null,
          html_url: c.author.html_url ?? null,
        };
        if (c.sha) bySha.set(c.sha, identity);
        const email = c.commit?.author?.email;
        if (email && !byEmail.has(email)) byEmail.set(email, identity);
      }
      if (batch.length < 100) break;
    }
  } catch (err) {
    console.warn(
      `  ⚠ could not fetch GitHub identities (${err.message}); contributors will be listed by git name without links`,
    );
  }
  return { bySha, byEmail };
}

// ─── Path helpers ─────────────────────────────────────────────────────────
/** Return the first two path components of a repo path, e.g.
 * "Physlib/QuantumMechanics/Foo/Bar.lean" → "Physlib/QuantumMechanics".
 * Single-component paths ("README.md") return the whole filename.
 */
function topSubfolder(filename) {
  const parts = filename.split("/");
  if (parts.length <= 1) return parts[0];
  if (parts.length === 2) return parts[0];
  return `${parts[0]}/${parts[1]}`;
}

// ─── LaTeX rendering ──────────────────────────────────────────────────────
// Characters that must be escaped when appearing in LaTeX body text (not in
// verbatim/listing blocks). Also substitutes common Lean 4 Unicode glyphs for
// their LaTeX-math equivalents so they render under XeLaTeX even when the
// current font lacks the glyph.
function texEscape(str) {
  if (str == null) return "";
  let out = String(str)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/</g, "\\textless{}")
    .replace(/>/g, "\\textgreater{}");
  for (const [ch, rep] of TEXT_UNICODE_SUBST) {
    if (out.includes(ch)) out = out.split(ch).join(rep);
  }
  return out;
}

/** Escape a URL for use inside \href{...}{}. Only { } % \ need escaping. */
function texEscapeUrl(url) {
  return String(url)
    .replace(/\\/g, "\\\\")
    .replace(/([{}%])/g, "\\$1");
}

/** Escape a string for inclusion inside a fancyvrb `Verbatim` block via `\Verb`.
 * We use `|...|` as the delimiter, so bar characters are the only concern.
 * For block Verbatim we don't need this — content is truly verbatim. */
function texEscapeInlineVerb(str) {
  return String(str).replace(/\|/g, " ");
}

const LEAN_KEYWORDS = [
  "theorem", "lemma", "def", "abbrev", "instance", "structure", "class",
  "inductive", "axiom", "example", "opaque", "noncomputable", "private",
  "protected", "unsafe", "partial", "scoped", "local", "by", "fun", "let",
  "in", "if", "then", "else", "do", "match", "with", "where", "open",
  "import", "namespace", "section", "end", "variable", "variables", "universe",
  "universes", "attribute", "notation", "infix", "infixl", "infixr", "prefix",
  "postfix", "informal_definition", "informal_lemma", "semiformal_result",
  "TODO", "return", "have", "show", "from", "calc", "at",
];

// Unicode → LaTeX literate replacements for the `listings` package.
//
// Strategy: we set the monospace font to DejaVu Sans Mono (loaded by filename
// in the preamble), which has native glyphs for Greek letters (α–ω, Α–Ω),
// subscripts (₀–₉, ₐ, ₑ, ᵢ, ᵣ, ᵤ, ᵥ, ₒ, ₓ), superscripts (⁰–⁹, ⁺, ⁻), most
// math operators (∈, ∀, ∃, →, ↔, ≤, ≥, etc.), blackboard bold (ℝ, ℕ, ℤ, ℚ,
// ℂ), angle brackets, and common relations. XeLaTeX renders these directly, so
// we DO NOT map them through math mode — doing so injects zero-width math
// boxes whose subscript baseline shifts the glyph ordering in the PDF text
// stream (which produced things like `x₀` copying as `₀x` and `S.ω` as `Sω.`).
//
// Only characters DejaVu Sans Mono doesn't ship or that `listings` treats
// specially need to appear here. Each entry is [char, latex, columns].
const LEAN_LITERATE = [
  // Script / calligraphic letters — DejaVu doesn't cover most of these.
  ["𝓩", "{$\\mathcal{Z}$}", 1], ["𝒵", "{$\\mathcal{Z}$}", 1],
  ["𝒜", "{$\\mathcal{A}$}", 1], ["ℬ", "{$\\mathcal{B}$}", 1],
  ["𝒞", "{$\\mathcal{C}$}", 1], ["𝒟", "{$\\mathcal{D}$}", 1],
  ["𝓔", "{$\\mathcal{E}$}", 1], ["ℱ", "{$\\mathcal{F}$}", 1],
  ["𝒢", "{$\\mathcal{G}$}", 1], ["ℋ", "{$\\mathcal{H}$}", 1],
  ["ℐ", "{$\\mathcal{I}$}", 1], ["𝒦", "{$\\mathcal{K}$}", 1],
  ["ℒ", "{$\\mathcal{L}$}", 1], ["ℳ", "{$\\mathcal{M}$}", 1],
  ["𝒩", "{$\\mathcal{N}$}", 1], ["𝒪", "{$\\mathcal{O}$}", 1],
  ["𝒫", "{$\\mathcal{P}$}", 1], ["𝒬", "{$\\mathcal{Q}$}", 1],
  ["ℛ", "{$\\mathcal{R}$}", 1], ["𝒮", "{$\\mathcal{S}$}", 1],
  ["𝒯", "{$\\mathcal{T}$}", 1], ["𝒰", "{$\\mathcal{U}$}", 1],
  ["𝒱", "{$\\mathcal{V}$}", 1], ["𝒲", "{$\\mathcal{W}$}", 1],
  ["𝒳", "{$\\mathcal{X}$}", 1], ["𝒴", "{$\\mathcal{Y}$}", 1],
  // Blackboard-bold letters DejaVu doesn't include.
  ["𝔽", "{$\\mathbb{F}$}", 1],
  // Rare glyphs sometimes seen in mathlib.
  ["⦃", "{$\\{\\!|$}", 1], ["⦄", "{$|\\!\\}$}", 1],
  ["◃", "{$\\triangleleft$}", 1], ["▹", "{$\\triangleright$}", 1],
  ["★", "{$\\star$}", 1], ["♯", "{$\\sharp$}", 1], ["♭", "{$\\flat$}", 1],
];

// Text-mode Unicode → LaTeX substitution table. Applied by `texEscape` on any
// content that is rendered in normal LaTeX text mode (docstrings, section
// headers, table cells, etc.). Not applied inside listings, which use their
// own `literate` mapping.
const TEXT_UNICODE_SUBST = [
  ["α", "\\ensuremath{\\alpha}"], ["β", "\\ensuremath{\\beta}"],
  ["γ", "\\ensuremath{\\gamma}"], ["δ", "\\ensuremath{\\delta}"],
  ["ε", "\\ensuremath{\\varepsilon}"], ["ζ", "\\ensuremath{\\zeta}"],
  ["η", "\\ensuremath{\\eta}"], ["θ", "\\ensuremath{\\theta}"],
  ["ι", "\\ensuremath{\\iota}"], ["κ", "\\ensuremath{\\kappa}"],
  ["λ", "\\ensuremath{\\lambda}"], ["μ", "\\ensuremath{\\mu}"],
  ["ν", "\\ensuremath{\\nu}"], ["ξ", "\\ensuremath{\\xi}"],
  ["π", "\\ensuremath{\\pi}"], ["ρ", "\\ensuremath{\\rho}"],
  ["σ", "\\ensuremath{\\sigma}"], ["τ", "\\ensuremath{\\tau}"],
  ["υ", "\\ensuremath{\\upsilon}"], ["φ", "\\ensuremath{\\varphi}"],
  ["χ", "\\ensuremath{\\chi}"], ["ψ", "\\ensuremath{\\psi}"],
  ["ω", "\\ensuremath{\\omega}"],
  ["Γ", "\\ensuremath{\\Gamma}"], ["Δ", "\\ensuremath{\\Delta}"],
  ["Θ", "\\ensuremath{\\Theta}"], ["Λ", "\\ensuremath{\\Lambda}"],
  ["Ξ", "\\ensuremath{\\Xi}"], ["Π", "\\ensuremath{\\Pi}"],
  ["Σ", "\\ensuremath{\\Sigma}"], ["Φ", "\\ensuremath{\\Phi}"],
  ["Ψ", "\\ensuremath{\\Psi}"], ["Ω", "\\ensuremath{\\Omega}"],
  ["→", "\\ensuremath{\\to}"], ["←", "\\ensuremath{\\gets}"],
  ["↔", "\\ensuremath{\\leftrightarrow}"], ["↦", "\\ensuremath{\\mapsto}"],
  ["⇒", "\\ensuremath{\\Rightarrow}"], ["⇐", "\\ensuremath{\\Leftarrow}"],
  ["⇔", "\\ensuremath{\\Leftrightarrow}"],
  ["∀", "\\ensuremath{\\forall}"], ["∃", "\\ensuremath{\\exists}"],
  ["∈", "\\ensuremath{\\in}"], ["∉", "\\ensuremath{\\notin}"],
  ["⊆", "\\ensuremath{\\subseteq}"], ["⊂", "\\ensuremath{\\subset}"],
  ["⊇", "\\ensuremath{\\supseteq}"], ["⊃", "\\ensuremath{\\supset}"],
  ["∪", "\\ensuremath{\\cup}"], ["∩", "\\ensuremath{\\cap}"],
  ["∅", "\\ensuremath{\\emptyset}"],
  ["≤", "\\ensuremath{\\leq}"], ["≥", "\\ensuremath{\\geq}"],
  ["≠", "\\ensuremath{\\neq}"], ["≡", "\\ensuremath{\\equiv}"],
  ["≃", "\\ensuremath{\\simeq}"], ["≅", "\\ensuremath{\\cong}"],
  ["≈", "\\ensuremath{\\approx}"],
  ["±", "\\ensuremath{\\pm}"], ["×", "\\ensuremath{\\times}"],
  ["·", "\\ensuremath{\\cdot}"], ["∘", "\\ensuremath{\\circ}"],
  ["⊕", "\\ensuremath{\\oplus}"], ["⊗", "\\ensuremath{\\otimes}"],
  ["⊤", "\\ensuremath{\\top}"], ["⊥", "\\ensuremath{\\bot}"],
  ["∇", "\\ensuremath{\\nabla}"], ["∂", "\\ensuremath{\\partial}"],
  ["∫", "\\ensuremath{\\int}"], ["∑", "\\ensuremath{\\sum}"],
  ["∏", "\\ensuremath{\\prod}"], ["∞", "\\ensuremath{\\infty}"],
  ["ℝ", "\\ensuremath{\\mathbb{R}}"], ["ℕ", "\\ensuremath{\\mathbb{N}}"],
  ["ℤ", "\\ensuremath{\\mathbb{Z}}"], ["ℚ", "\\ensuremath{\\mathbb{Q}}"],
  ["ℂ", "\\ensuremath{\\mathbb{C}}"], ["𝔽", "\\ensuremath{\\mathbb{F}}"],
  ["ℓ", "\\ensuremath{\\ell}"], ["ℏ", "\\ensuremath{\\hbar}"],
  ["⟨", "\\ensuremath{\\langle}"], ["⟩", "\\ensuremath{\\rangle}"],
  ["…", "\\ensuremath{\\ldots}"],
  ["₀", "\\ensuremath{_{0}}"], ["₁", "\\ensuremath{_{1}}"], ["₂", "\\ensuremath{_{2}}"],
  ["₃", "\\ensuremath{_{3}}"], ["₄", "\\ensuremath{_{4}}"], ["₅", "\\ensuremath{_{5}}"],
  ["₆", "\\ensuremath{_{6}}"], ["₇", "\\ensuremath{_{7}}"], ["₈", "\\ensuremath{_{8}}"],
  ["₉", "\\ensuremath{_{9}}"], ["ₙ", "\\ensuremath{_{n}}"], ["ₘ", "\\ensuremath{_{m}}"],
  ["ₐ", "\\ensuremath{_{a}}"], ["ᵢ", "\\ensuremath{_{i}}"], ["ⱼ", "\\ensuremath{_{j}}"],
  ["ₖ", "\\ensuremath{_{k}}"], ["ₜ", "\\ensuremath{_{t}}"], ["ₓ", "\\ensuremath{_{x}}"],
  ["⁰", "\\ensuremath{^{0}}"], ["¹", "\\ensuremath{^{1}}"], ["²", "\\ensuremath{^{2}}"],
  ["³", "\\ensuremath{^{3}}"], ["⁴", "\\ensuremath{^{4}}"], ["⁵", "\\ensuremath{^{5}}"],
  ["⁶", "\\ensuremath{^{6}}"], ["⁷", "\\ensuremath{^{7}}"], ["⁸", "\\ensuremath{^{8}}"],
  ["⁹", "\\ensuremath{^{9}}"], ["⁻", "\\ensuremath{^{-}}"], ["⁺", "\\ensuremath{^{+}}"],
  ["¬", "\\ensuremath{\\neg}"], ["∧", "\\ensuremath{\\wedge}"], ["∨", "\\ensuremath{\\vee}"],
];

// Glyphs that XeLaTeX reported as missing from DejaVu Sans Mono when compiling
// real months. XeLaTeX has no font-fallback mechanism (that is a LuaTeX
// feature), so anything not mapped here silently typesets as nothing at all.
//
// Each entry is [char, math-mode body]. Both tables below are extended from
// this one list: `ℓ` was previously present in the text table but absent from
// the listings table, so it rendered in docstrings and vanished in code. One
// list, applied to both, is what stops that drift recurring.
const MISSING_GLYPH_MATH = [
  // Modifier letters used as super/subscripts.
  ["ʲ", "^{j}"], ["ʳ", "^{r}"], ["ᴴ", "^{H}"], ["ᵀ", "^{T}"],
  ["ᵃ", "^{a}"], ["ᵈ", "^{d}"], ["ᵖ", "^{p}"], ["ᵘ", "^{u}"],
  ["ᵛ", "^{v}"], ["ᵟ", "^{\\delta}"], ["ᶜ", "^{c}"], ["ᶠ", "^{f}"],
  ["ⁱ", "^{i}"], ["ᵣ", "_{r}"], ["ᵥ", "_{v}"], ["ₗ", "_{l}"],
  ["ₛ", "_{s}"],
  // Orthogonal-complement postfix, as used in mathlib.
  ["ᗮ", "^{\\perp}"],
  // Letterlike and blackboard forms.
  ["ℓ", "\\ell"], ["𝑅", "R"], ["𝕜", "\\Bbbk"], ["𝟙", "\\mathbb{1}"],
  // Bold-script capitals (U+1D4D0 block) - distinct codepoints from the
  // plain script capitals already in LEAN_LITERATE.
  ["𝓘", "\\mathcal{I}"], ["𝓞", "\\mathcal{O}"], ["𝓡", "\\mathcal{R}"],
  ["𝓢", "\\mathcal{S}"],
  // Operators and relations.
  ["∣", "\\mid"], ["⊓", "\\sqcap"], ["⋊", "\\rtimes"],
  ["⟪", "\\langle\\!\\langle"], ["⟫", "\\rangle\\!\\rangle"],
  ["⟶", "\\longrightarrow"], ["⟹", "\\Longrightarrow"],
  ["⨂", "\\bigotimes"], ["⨅", "\\bigsqcap"], ["⨯", "\\times"],
  ["⬝", "\\cdot"],
];

for (const [ch, body] of MISSING_GLYPH_MATH) {
  if (!LEAN_LITERATE.some(([c]) => c === ch)) {
    LEAN_LITERATE.push([ch, `{$${body}$}`, 1]);
  }
  if (!TEXT_UNICODE_SUBST.some(([c]) => c === ch)) {
    TEXT_UNICODE_SUBST.push([ch, `\\ensuremath{${body}}`]);
  }
}

function literateDirective() {
  return LEAN_LITERATE
    .map(([ch, rep, cols]) => `{${ch}}{${rep}}${cols}`)
    .join(" ");
}

function humanKind(kind) {
  return kind.replace(/_/g, " ");
}

function humanList(arr) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
}

function fmtN(n) {
  return new Intl.NumberFormat("en-US").format(n);
}

function renderLatex(report) {
  const authors = report.contributors
    .map((c) => texEscape(c.login || c.name || "unknown"))
    .join(" \\and ");

  const totalDecls = Object.values(report.kindTotals).reduce(
    (a, b) => a + b,
    0,
  );

  // Introduction paragraph
  const kindPhrase = humanList(
    Object.entries(report.kindTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${fmtN(n)} ${humanKind(k)}${n === 1 ? "" : "s"}`),
  );
  const subfolderPhrase = report.subfolders.length > 0
    ? ` spanning ${report.subfolders.length} top-level ${report.subfolders.length === 1 ? "area" : "areas"} of the repository`
    : "";
  const intro =
    `During ${texEscape(report.label)}, ${fmtN(report.contributors.length)} ` +
    `${report.contributors.length === 1 ? "contributor" : "contributors"} ` +
    `submitted ${fmtN(report.totalCommits)} ` +
    `${report.totalCommits === 1 ? "commit" : "commits"} that changed ` +
    `${fmtN(report.linesChanged)} lines ` +
    `(\\textcolor{addcol}{+${fmtN(report.totalAdditions)}} / ` +
    `\\textcolor{delcol}{-${fmtN(report.totalDeletions)}}) ` +
    `across ${fmtN(report.totalFilesChanged)} ` +
    `${report.totalFilesChanged === 1 ? "file" : "files"}${subfolderPhrase}. ` +
    (totalDecls > 0
      ? `This report catalogues ${fmtN(totalDecls)} newly added Lean declarations: ${kindPhrase}.`
      : "No new Lean declarations were detected in this month's diff.");

  // Sections
  const contributorRows = report.contributors
    .map((c) => {
      const label = c.login
        ? `\\href{${texEscapeUrl(c.html_url)}}{\\texttt{${texEscape(c.login)}}}`
        : `\\texttt{${texEscape(c.name || "unknown")}}`;
      return `${label} & ${c.commits} \\\\`;
    })
    .join("\n");

  const subfolderRows = report.subfolders
    .map(
      (s) =>
        `\\texttt{${texEscape(s.path)}} & ${s.files} & \\textcolor{addcol}{+${fmtN(s.additions)}} & \\textcolor{delcol}{-${fmtN(s.deletions)}} \\\\`,
    )
    .join("\n");

  const kindRows = Object.entries(report.kindTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `\\texttt{${texEscape(k)}} & ${fmtN(n)} \\\\`)
    .join("\n");

  // Per-file body sections
  const fileSections = report.files
    .map((f) => renderFileSection(f, report))
    .join("\n\n");

  const noDeclsNote = report.files.length === 0
    ? "\\noindent\\emph{No new definitions, theorems, or lemmas were detected in the diff for this month. See the full compare link above for other changes.}\n"
    : "";

  return String.raw`% !TEX program = xelatex
% Auto-generated by web2/scripts/generate-monthly-updates.js
\documentclass[11pt,a4paper]{article}

\usepackage[margin=1in]{geometry}
\usepackage{fontspec}
\usepackage{amsmath}
\usepackage{amssymb}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{listings}
\usepackage{parskip}
\usepackage{booktabs}
\usepackage{longtable}
\usepackage{titling}
\usepackage{fancyhdr}
\usepackage{tocloft}
\usepackage{microtype}

% Use DejaVu Sans Mono for the monospace font -- it ships with TeX Live's
% dejavu package (which tectonic bundles) and has broad Unicode coverage for
% the Greek, subscripts, and math glyphs common in Lean 4 source. Loading by
% filename works both under system xelatex and inside tectonic's font bundle.
\setmonofont{DejaVuSansMono.ttf}[
  BoldFont       = DejaVuSansMono-Bold.ttf,
  ItalicFont     = DejaVuSansMono-Oblique.ttf,
  BoldItalicFont = DejaVuSansMono-BoldOblique.ttf,
  Scale          = MatchLowercase,
]

\definecolor{addcol}{HTML}{047857}
\definecolor{delcol}{HTML}{be123c}
\definecolor{leankw}{HTML}{1e3a8a}
\definecolor{leancomment}{HTML}{047857}
\definecolor{leanstring}{HTML}{9a3412}
\definecolor{docbg}{HTML}{f8f9fc}
\definecolor{docrule}{HTML}{dbe1ec}

\hypersetup{
  colorlinks=true,
  linkcolor=blue!50!black,
  urlcolor=blue!50!black,
  citecolor=blue!50!black,
  pdftitle={Physlib Monthly Report -- ${texEscape(report.label)}},
  pdfauthor={${report.contributors.map((c) => texEscape(c.login || c.name || "unknown")).join(", ")}},
  pdfsubject={Monthly diff summary of leanprover-community/physlib},
}

\lstdefinelanguage{Lean}{
  keywords={${LEAN_KEYWORDS.join(",")}},
  keywordstyle=\color{leankw}\bfseries,
  sensitive=true,
  morecomment=[l]{--},
  morecomment=[s]{/-}{-/},
  commentstyle=\color{leancomment}\itshape,
  morestring=[b]",
  stringstyle=\color{leanstring},
}
\lstset{
  basicstyle=\ttfamily\small,
  language=Lean,
  breaklines=true,
  breakatwhitespace=false,
  showstringspaces=false,
  frame=single,
  rulecolor=\color{docrule},
  framerule=0.4pt,
  numbers=none,
  aboveskip=6pt,
  belowskip=6pt,
  extendedchars=true,
  columns=fullflexible,
  keepspaces=true,
  inputencoding=utf8,
  literate=${literateDirective()}
}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small Physlib Monthly Report}
\fancyhead[R]{\small ${texEscape(report.label)}}
\fancyfoot[C]{\thepage}
\renewcommand{\headrulewidth}{0.4pt}

\title{\vspace{-1cm}\textbf{Physlib Monthly Report} \\[0.3em] \Large ${texEscape(report.label)}}
\author{${authors || "\\emph{No authors recorded}"}}
\date{Generated ${texEscape(new Date(report.generatedAt).toUTCString())}}

\begin{document}
\maketitle

\begin{abstract}
\noindent Auto-generated summary of changes to
\href{https://github.com/${texEscapeUrl(report.repo)}}{\texttt{${texEscape(report.repo)}}}
on branch \texttt{${texEscape(report.branch)}} between
\texttt{${texEscape(report.baseSha.slice(0, 7))}} and
\texttt{${texEscape(report.headSha.slice(0, 7))}}.
The full diff is available at
\href{${texEscapeUrl(report.compareUrl)}}{GitHub compare}.
\end{abstract}

\tableofcontents
\newpage

\section{Introduction}
${intro}

\vspace{0.5em}
\noindent See the
\href{${texEscapeUrl(report.compareUrl)}}{full compare diff}
and the
\href{${texEscapeUrl(report.commitsUrl)}}{list of commits}
on GitHub for the raw source.

\subsection{Contributors}
${
  report.contributors.length === 0
    ? "\\emph{No contributors identified for this month.}"
    : `\\begin{longtable}{l r}\n\\toprule\nContributor & Commits \\\\\n\\midrule\n${contributorRows}\n\\bottomrule\n\\end{longtable}`
}

\subsection{Modified subfolders}
${
  report.subfolders.length === 0
    ? "\\emph{No modified files were detected.}"
    : `\\begin{longtable}{l r r r}\n\\toprule\nSubfolder & Files & Additions & Deletions \\\\\n\\midrule\n${subfolderRows}\n\\bottomrule\n\\end{longtable}`
}

\subsection{New declarations by kind}
${
  Object.keys(report.kindTotals).length === 0
    ? "\\emph{No new declarations were detected.}"
    : `\\begin{longtable}{l r}\n\\toprule\nKind & Count \\\\\n\\midrule\n${kindRows}\n\\bottomrule\n\\end{longtable}`
}

\section{Details by file}
${noDeclsNote}${fileSections}

\end{document}
`;
}

function renderFileSection(fileEntry, report) {
  const module = fileEntry.filename.replace(/\.lean$/, "").replace(/\//g, ".");
  const fileUrl = `https://github.com/${report.repo}/blob/${report.branch}/${fileEntry.filename}`;
  const declBlocks = fileEntry.entries
    .map((d) => renderDeclaration(d, report))
    .join("\n\n");
  // \subsection is used so the TOC shows every file. Names in monospace, escaped.
  return `\\subsection{\\texorpdfstring{\\texttt{${texEscape(module)}}}{${texEscape(module)}}}\n` +
    `\\noindent\\small \\href{${texEscapeUrl(fileUrl)}}{\\texttt{${texEscape(fileEntry.filename)}}} on GitHub.\\normalsize\n\n${declBlocks}`;
}

function renderDeclaration(decl, report) {
  const url =
    `https://github.com/${report.repo}/blob/${report.branch}/${decl.file}` +
    (decl.line ? `#L${decl.line}` : "");
  const header = `\\paragraph{\\texttt{${texEscape(decl.kind)}} \\texttt{${texEscape(decl.name)}}}` +
    ` \\hfill \\href{${texEscapeUrl(url)}}{\\footnotesize [source]}`;
  const doc = decl.docstring
    ? `\n\\begin{quote}\\itshape\n${texEscape(decl.docstring)}\n\\end{quote}\n`
    : "\n";
  const snippet = decl.snippet || "";
  // Emit code snippet as a Lean listing. Content is verbatim; no escaping.
  const listing = `\\begin{lstlisting}[language=Lean]\n${snippet}\n\\end{lstlisting}`;
  return `${header}\n${doc}${listing}`;
}

// ─── PDF compilation ──────────────────────────────────────────────────────
function which(cmd) {
  const res = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], {
    encoding: "utf8",
  });
  if (res.status === 0) return res.stdout.split("\n")[0].trim();
  return null;
}

/**
 * Compile `texPath` → `pdfPath`.
 *
 * Returns { ok, missingGlyphs, overfull } on success, or { ok: false,
 * noEngine: true } when neither engine is installed. Throws on genuine
 * compilation errors so the caller can warn without aborting the whole run.
 *
 * The diagnostics matter: a glyph the font lacks does not fail the build, it
 * just typesets as nothing, so the only way to notice is to read the log.
 */
function compileLatex(texPath, pdfPath) {
  const tectonic = which("tectonic");
  const xelatex = which("xelatex");
  if (!tectonic && !xelatex) return { ok: false, noEngine: true };

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "physlib-monthly-"));
  const base = path.basename(texPath, ".tex");
  try {
    // Capture rather than inherit: a 200-page document produces thousands of
    // lines of noise. On failure we print the tail, which is where the error is.
    const run = (cmd, cmdArgs) => {
      const res = spawnSync(cmd, cmdArgs, { encoding: "utf8", maxBuffer: 1 << 28 });
      if (res.status !== 0) {
        const tail = String(res.stdout ?? "").split("\n").slice(-25).join("\n");
        throw new Error(
          `${path.basename(cmd)} exited with status ${res.status}\n${tail}`,
        );
      }
    };

    if (tectonic) {
      // tectonic reruns internally as needed to settle the TOC.
      run(tectonic, ["--outdir", tmpDir, "--keep-logs", "--chatter", "minimal", texPath]);
    } else {
      // xelatex needs two runs for the TOC.
      for (let i = 0; i < 2; i++) {
        run(xelatex, [
          "-interaction=nonstopmode",
          "-halt-on-error",
          "-output-directory",
          tmpDir,
          texPath,
        ]);
      }
    }

    const producedPdf = path.join(tmpDir, `${base}.pdf`);
    if (!fs.existsSync(producedPdf)) {
      throw new Error(`compiler produced no PDF at ${producedPdf}`);
    }

    // Scrape the log before the temp dir goes away.
    let missingGlyphs = [];
    let overfull = 0;
    try {
      const log = fs.readFileSync(path.join(tmpDir, `${base}.log`), "utf8");
      missingGlyphs = [
        ...new Set(
          (log.match(/There is no \S+ \(U\+[0-9A-F]+\)/g) ?? []).map((m) =>
            m.replace(/^There is no /, ""),
          ),
        ),
      ];
      overfull = (log.match(/Overfull \\hbox/g) ?? []).length;
    } catch {
      /* log is advisory only */
    }

    fs.copyFileSync(producedPdf, pdfPath);
    return { ok: true, missingGlyphs, overfull };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* best effort */ }
  }
}

// ─── Main per-month logic ─────────────────────────────────────────────────
async function generateMonth(year, monthIdx, defaultBranch, opts = {}) {
  const slug = formatMonthSlug(year, monthIdx);
  const label = formatMonthLabel(year, monthIdx);
  const outPath = path.join(OUT_DIR, `${slug}.json`);
  if (fs.existsSync(outPath) && !opts.force) {
    console.log(`• ${slug}: exists, skipping (use --force to regenerate)`);
    return { skipped: true, slug };
  }

  const { start, end } = monthBoundsUTC(year, monthIdx);
  const now = new Date();
  if (end > now) {
    console.log(`• ${slug}: month is not yet complete, skipping`);
    return { skipped: true, slug };
  }
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  console.log(`• ${slug}: locating boundary commits…`);
  const baseSha = commitBefore(defaultBranch, startIso);
  const headSha = commitBefore(defaultBranch, endIso);
  if (!baseSha || !headSha) {
    console.log(`• ${slug}: no commits found on ${defaultBranch}, skipping`);
    return { skipped: true, slug };
  }
  if (baseSha === headSha) {
    console.log(`• ${slug}: no changes on ${defaultBranch}, writing empty report`);
  }
  // Both boundaries come off the first-parent chain, so this should always
  // hold. Assert rather than assume: if it ever fails, the diff below would
  // silently include unrelated parallel-branch work.
  if (baseSha !== headSha && !isAncestor(baseSha, headSha)) {
    throw new Error(
      `boundary commits are not comparable: ${baseSha.slice(0, 7)} is not an ancestor of ${headSha.slice(0, 7)}`,
    );
  }

  console.log(`• ${slug}: diffing ${baseSha.slice(0, 7)}…${headSha.slice(0, 7)}`);
  const stats = numstat(baseSha, headSha);
  let totalAdditions = 0;
  let totalDeletions = 0;
  const subfolderStats = new Map(); // subfolder -> { files: Set, additions, deletions }
  for (const f of stats) {
    totalAdditions += f.additions;
    totalDeletions += f.deletions;
    const sub = topSubfolder(f.filename);
    if (!subfolderStats.has(sub)) {
      subfolderStats.set(sub, { files: new Set(), additions: 0, deletions: 0 });
    }
    const s = subfolderStats.get(sub);
    s.files.add(f.filename);
    s.additions += f.additions;
    s.deletions += f.deletions;
  }

  const subfolders = Array.from(subfolderStats.entries())
    .map(([p, s]) => ({
      path: p,
      files: s.files.size,
      additions: s.additions,
      deletions: s.deletions,
    }))
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));

  // New declarations: parse each changed .lean file in full at both commits
  // and set-difference by fully-qualified name. Never from diff hunks - a hunk
  // is an arbitrary window, so a *modified* declaration is indistinguishable
  // from a new one. See scripts/lean-decls.js.
  const leanFiles = changedLeanFiles(baseSha, headSha);
  console.log(`• ${slug}: parsing ${leanFiles.length} changed .lean files…`);
  const filesReport = [];
  for (const { oldPath, newPath } of leanFiles) {
    const newContents = fileAt(headSha, newPath);
    if (newContents === null) continue; // deleted again before the month ended
    const oldContents = oldPath ? fileAt(baseSha, oldPath) : null;
    const added = findAddedDeclarations(oldContents, newContents);
    if (added.length === 0) continue;
    filesReport.push({
      filename: newPath,
      entries: added.map((d) => ({
        file: newPath,
        kind: d.kind,
        name: d.name,
        docstring: d.doc,
        snippet: d.signature,
        line: d.line,
      })),
    });
  }
  filesReport.sort((a, b) => a.filename.localeCompare(b.filename));

  // Contributors: commit counts from git (exact, no pagination cap, and no
  // double-counting of a commit that lands exactly on a month boundary the way
  // the API's inclusive since/until does). GitHub is consulted only to attach
  // logins and avatars, and is entirely optional.
  const commits = commitsInRange(baseSha, headSha);
  const { bySha, byEmail } = await githubIdentities(defaultBranch, startIso, endIso);
  const contributors = new Map();
  for (const c of commits) {
    const id = bySha.get(c.sha) ?? byEmail.get(c.email);
    const key = id ? `login:${id.login}` : `name:${c.name}`;
    if (!contributors.has(key)) {
      contributors.set(key, {
        login: id ? id.login : null,
        name: id ? undefined : c.name,
        html_url: id ? id.html_url : null,
        avatar_url: id ? id.avatar_url : null,
        commits: 0,
      });
    }
    contributors.get(key).commits += 1;
  }
  const contributorList = Array.from(contributors.values()).sort(
    (a, b) =>
      b.commits - a.commits ||
      (a.login ?? a.name ?? "").localeCompare(b.login ?? b.name ?? ""),
  );

  const kindTotals = {};
  for (const { entries } of filesReport) {
    for (const e of entries) kindTotals[e.kind] = (kindTotals[e.kind] || 0) + 1;
  }

  const report = {
    slug,
    label,
    year,
    month: monthIdx + 1,
    startDate: startIso,
    endDate: endIso,
    repo: `${OWNER}/${REPO}`,
    branch: defaultBranch,
    baseSha,
    headSha,
    compareUrl: `https://github.com/${OWNER}/${REPO}/compare/${baseSha}...${headSha}`,
    commitsUrl: `https://github.com/${OWNER}/${REPO}/commits/${defaultBranch}?since=${startIso}&until=${endIso}`,
    totalCommits: commits.length,
    totalAdditions,
    totalDeletions,
    linesChanged: totalAdditions + totalDeletions,
    totalFilesChanged: stats.length,
    subfolders,
    contributors: contributorList,
    kindTotals,
    files: filesReport,
    pdfUrl: `/monthly-updates/${slug}.pdf`,
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  const totalDecls = Object.values(kindTotals).reduce((a, b) => a + b, 0);
  console.log(
    `✓ ${slug}: ${filesReport.length} files w/ decls (${stats.length} touched), ${totalDecls} declarations, ${contributorList.length} contributors → ${path.relative(process.cwd(), outPath)}`,
  );

  // ─── LaTeX + PDF ────────────────────────────────────────────────────
  if (!opts.noPdf) {
    try {
      fs.mkdirSync(PDF_DIR, { recursive: true });
      fs.mkdirSync(TEX_DIR, { recursive: true });
      const texPath = path.join(TEX_DIR, `${slug}.tex`);
      const tex = renderLatex(report);
      fs.writeFileSync(texPath, tex, "utf8");
      console.log(
        `  … wrote ${path.relative(process.cwd(), texPath)}`,
      );
      const pdfPath = path.join(PDF_DIR, `${slug}.pdf`);
      const compiled = compileLatex(texPath, pdfPath);
      if (compiled.ok) {
        console.log(`  … compiled ${path.relative(process.cwd(), pdfPath)}`);
        if (compiled.overfull) {
          console.log(`  … ${compiled.overfull} overfull line(s)`);
        }
        // Not fatal - the PDF is fine apart from these - but it must be
        // visible, because the failure mode is a glyph silently rendering as
        // nothing. Add any listed codepoint to MISSING_GLYPH_MATH.
        if (compiled.missingGlyphs.length) {
          console.warn(
            `  ⚠ ${compiled.missingGlyphs.length} glyph(s) missing from the font and rendered as blank: ${compiled.missingGlyphs.join(", ")}`,
          );
        }
      } else if (compiled.noEngine) {
        console.warn(
          `  ⚠ neither tectonic nor xelatex was found on PATH — skipping PDF compile for ${slug}. Install tectonic (https://tectonic-typesetting.github.io) to enable local PDF builds.`,
        );
      }
    } catch (err) {
      console.warn(`  ⚠ PDF build failed for ${slug}: ${err.message}`);
    }
  }

  return { skipped: false, slug };
}

// ─── Entry point ──────────────────────────────────────────────────────────
(async function main() {
  if (!TOKEN) {
    console.warn(
      "⚠️  GITHUB_TOKEN is not set. Contributor identity lookups will be unauthenticated (60 req/h), which is enough for a month or two but will rate-limit on a long backfill. Everything else works offline.",
    );
  }

  try {
    ensureRepo();
    const defaultBranch = resolveBranchRef();
    console.log(`• default branch: ${defaultBranch}`);

    const targets = [];
    if (monthArg) {
      const m = monthArg.match(/^(\d{4})-(\d{2})$/);
      if (!m) {
        console.error("--month must be YYYY-MM");
        process.exit(1);
      }
      targets.push({ year: parseInt(m[1], 10), monthIdx: parseInt(m[2], 10) - 1 });
    } else if (backfillArg) {
      const n = parseInt(backfillArg, 10);
      if (!Number.isFinite(n) || n <= 0) {
        console.error("--backfill must be a positive integer");
        process.exit(1);
      }
      const { year, monthIdx } = prevMonthUTC();
      for (let i = 0; i < n; i++) {
        const d = new Date(Date.UTC(year, monthIdx - i, 1));
        targets.push({ year: d.getUTCFullYear(), monthIdx: d.getUTCMonth() });
      }
    } else {
      targets.push(prevMonthUTC());
    }

    for (const t of targets) {
      try {
        await generateMonth(t.year, t.monthIdx, defaultBranch, {
          force: flagForce,
          noPdf: flagNoPdf,
        });
      } catch (err) {
        console.error(
          `✗ ${formatMonthSlug(t.year, t.monthIdx)}: ${err.message}`,
        );
        // Continue with next target on failure so backfills are resilient.
      }
    }
  } catch (err) {
    console.error(`✗ fatal: ${err.message}`);
    process.exit(1);
  }
})();
