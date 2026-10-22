#!/usr/bin/env node
// Keep an exact, validated copy of Physlib's contributor tips for offline site builds.
const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { parseContributionTips } = require("../src/lib/contribution-tips-content");

const REPOSITORY = "leanprover-community/physlib";
const REF = "master";
const SOURCE_PATH = "docs/contribution-tips.md";
const DEFAULT_OUTPUT = path.join(__dirname, "../data");

/** Read a public GitHub resource without printing credentials or response bodies. */
async function githubJson(endpoint, fetcher) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "physlib-contribution-tips",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetcher(`https://api.github.com/repos/${REPOSITORY}/${endpoint}`, {
    headers, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}; existing tips were kept.`);
  return response.json();
}

/** Replace one generated file after the complete source has been validated. */
async function writeAtomic(filename, content) {
  const temporary = `${filename}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, content, "utf8");
    await fs.rename(temporary, filename);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

/** Refresh the snapshot, preserving the last good copy on download or validation errors. */
async function syncContributionTips({ sourceFile, outputDir = DEFAULT_OUTPUT, fetcher = fetch } = {}) {
  let markdown;
  let commit = null;
  if (sourceFile) {
    markdown = await fs.readFile(sourceFile, "utf8");
  } else {
    const revision = await githubJson(`commits/${REF}`, fetcher);
    commit = revision.sha;
    if (!/^[a-f0-9]{40}$/.test(commit ?? "")) throw new Error("GitHub returned an invalid commit.");
    const file = await githubJson(`contents/${SOURCE_PATH}?ref=${commit}`, fetcher);
    if (file.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") {
      throw new Error("GitHub did not return a Markdown file.");
    }
    markdown = Buffer.from(file.content, "base64").toString("utf8");
  }
  const tips = parseContributionTips(markdown);
  const source = {
    repository: REPOSITORY, ref: REF, path: SOURCE_PATH, commit,
    sha256: createHash("sha256").update(markdown, "utf8").digest("hex"),
  };
  const documentPath = path.join(outputDir, "contribution-tips.md");
  const sourcePath = path.join(outputDir, "contribution-tips.source.json");
  const previous = await Promise.all([
    fs.readFile(documentPath, "utf8").catch((error) => { if (error.code === "ENOENT") return null; throw error; }),
    fs.readFile(sourcePath, "utf8").catch((error) => { if (error.code === "ENOENT") return null; throw error; }),
  ]);
  let previousSource;
  try { previousSource = JSON.parse(previous[1]); } catch { previousSource = null; }
  if (previous[0] === markdown && previousSource?.sha256 === source.sha256 &&
      previousSource.repository === REPOSITORY && previousSource.path === SOURCE_PATH &&
      previousSource.ref === REF && (sourceFile || previousSource.commit)) {
    return { changed: false, count: tips.length };
  }
  await fs.mkdir(outputDir, { recursive: true });
  await writeAtomic(documentPath, markdown);
  await writeAtomic(sourcePath, JSON.stringify(source, null, 2) + "\n");
  return { changed: true, count: tips.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === "--source")) {
    console.error("Usage: node scripts/sync-contribution-tips.js [--source path/to/contribution-tips.md]");
    process.exitCode = 1;
  } else {
    syncContributionTips({ sourceFile: args[1] }).then(({ changed, count }) => {
      console.log(`${changed ? "Updated" : "Kept"} contribution tips (${count} tips).`);
    }).catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  }
}

module.exports = { syncContributionTips };
