// The catalogue lists tracked Lean source files at pinned revisions. Reading
// file names is sufficient here: only the separate curated result feed plots
// individual declarations.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const exec = promisify(execFile);
const cacheDir = fileURLToPath(new URL("../.cache/roadmap-projects/", import.meta.url));
const outDir = fileURLToPath(new URL("../public/roadmap-view/projects/", import.meta.url));
const registryUrl = new URL("./roadmap-project-registry.json", import.meta.url);
const excludedDirs = new Set([
  ".git", ".github", ".lake", ".elan", "lake-packages", "_target", "node_modules", "build", "dist",
  "third_party", "third-party", "thirdparty", "vendor", "vendored", "deps",
  "test", "tests", "testdata", "comparatorchallenges",
]);

function eligible(path) {
  const parts = path.split("/");
  const file = parts.pop();
  return file.endsWith(".lean") && file.toLowerCase() !== "lakefile.lean"
    && !parts.some((dir) => excludedDirs.has(dir.toLowerCase()));
}
function selected(path, selectors) {
  return !selectors || selectors.some((s) => s.endsWith("/") ? path.startsWith(s) : path === s);
}
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function readJson(path) {
  try { return JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return undefined; throw error; }
}
async function saveJson(file, value) {
  const tmp = file + "." + process.pid + ".tmp";
  await writeFile(tmp, JSON.stringify(value) + "\n");
  await rename(tmp, file);
}

async function githubTree(repository, rev, recursive) {
  const route = `repos/${repository}/git/trees/${rev}${recursive ? "?recursive=1" : ""}`;
  for (let i = 0; ; i++) {
    try {
      // In Actions, keep the automatically provisioned token on the GitHub API
      // origin only. Locally, gh can use its existing credential store.
      if (!process.env.GITHUB_TOKEN) {
        try {
          const result = await exec("gh", ["api", route], { maxBuffer: 100 * 1024 * 1024, timeout: 90000 });
          return JSON.parse(result.stdout);
        } catch (err) { if (err.code !== "ENOENT") throw err; }
      }
      const headers = { Accept: "application/vnd.github+json" };
      if (process.env.GITHUB_TOKEN) headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
      const response = await fetch("https://api.github.com/" + route, {
        headers, redirect: "error", signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) throw new Error(`${repository}: GitHub returned HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (i >= 2 || /\b(401|403|404)\b/.test(err.message)) throw err;
      await delay(500 * 2 ** i);
    }
  }
}

async function collectFiles(repository, revision, selectors) {
  const files = [];
  async function visit(tree, base, wholeSubtree) {
    const result = await githubTree(repository, tree, wholeSubtree);
    if (result.truncated) {
      if (!wholeSubtree) throw new Error(`Truncated nonrecursive tree at ${repository}:${base}`);
      await visit(tree, base, false);
      return;
    }
    for (const item of result.tree) {
      const path = base + item.path;
      if (item.type === "blob" && /^100(644|755)$/.test(item.mode) && eligible(path) && selected(path, selectors)) {
        files.push(path);
      } else if (!wholeSubtree && item.type === "tree" && !excludedDirs.has(item.path.toLowerCase())) {
        const prefix = path + "/";
        const full = !selectors || selectors.some((s) => s.endsWith("/") && prefix.startsWith(s));
        if (full || selectors.some((s) => s.startsWith(prefix))) await visit(item.sha, prefix, full);
      }
    }
  }
  await visit(revision, "", !selectors);
  return files.sort();
}

function verifyEntry(entry) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(entry.repository) || !/^[a-f0-9]{40}$/.test(entry.revision)
    || !/^[\w-]+$/.test(entry.subject)) throw new Error("Invalid project registry row: " + JSON.stringify(entry));
  for (const selector of entry.include ?? []) {
    if (selector.startsWith("/") || selector.includes("..") || !(selector.endsWith("/") || selector.endsWith(".lean"))) {
      throw new Error(`Invalid scope in ${entry.repository}: ${selector}`);
    }
  }
}

// Keep the weekly refresh reproducible and inexpensive. A previously verified
// committed inventory at the exact revision/scope is a valid offline input.
async function buildRepository(entries) {
  const { repository, revision } = entries[0];
  const [owner, repo] = repository.split("/");
  const records = [];
  for (const entry of entries) {
    const key = hash([2, repository, revision, [...(entry.include ?? [])].sort()]);
    const id = [owner, repo, entry.subject, key.slice(0, 16)].join("--");
    const file = join(outDir, id + ".json");
    const href = "/roadmap-view/projects/" + encodeURIComponent(id) + ".json";
    const old = await readJson(file);
    records.push({ entry, file, href, key, data: old?.key === key ? old : undefined });
  }
  const missing = records.filter((record) => !record.data);
  if (missing.length) {
    const scopes = missing.map(({ entry }) => entry.include);
    const selectors = scopes.every(Boolean) ? [...new Set(scopes.flat())].sort() : undefined;
    const cacheFile = join(cacheDir, hash([2, repository, revision, selectors]) + ".json");
    let paths = await readJson(cacheFile);
    if (!paths) {
      paths = await collectFiles(repository, revision, selectors);
      await saveJson(cacheFile, paths);
    }
    for (const record of missing) {
      const files = paths.filter((p) => selected(p, record.entry.include));
      record.data = { repository, revision, key: record.key, files };
    }
  }
  return records;
}

export async function buildExternalCatalogue() {
  await Promise.all([mkdir(cacheDir, { recursive: true }), mkdir(outDir, { recursive: true })]);
  const registry = await readJson(registryUrl);
  const groups = new Map();
  const used = new Set();
  for (const entry of registry) {
    verifyEntry(entry);
    const id = entry.repository.toLowerCase() + "/" + entry.subject;
    if (used.has(id)) throw new Error(`Duplicate inventory for ${id}`);
    used.add(id);
    const rev = entry.repository + "@" + entry.revision;
    if (!groups.has(rev)) groups.set(rev, []);
    groups.get(rev).push(entry);
  }
  const queue = [...groups.values()];
  const all = [];
  let next = 0;
  async function worker() {
    while (next < queue.length) all.push(...await buildRepository(queue[next++]));
  }
  await Promise.all(Array.from({ length: Math.min(5, queue.length) }, worker));
  all.sort((a, b) => a.entry.repository.localeCompare(b.entry.repository, "en") || a.entry.subject.localeCompare(b.entry.subject, "en"));

  const markers = [];
  const unique = new Map();
  const empty = [];
  for (const { entry, file, href, data } of all) {
    if (!data.files.length) {
      empty.push(entry.repository + " (" + entry.subject + ")");
      continue;
    }
    if (!unique.has(entry.repository)) unique.set(entry.repository, new Set());
    const paths = unique.get(entry.repository);
    for (const path of data.files) {
      if (paths.has(path)) throw new Error(`Overlapping subject inventories: ${entry.repository}/${path}`);
      paths.add(path);
    }
    await saveJson(file, data);
    markers.push({
      subject: entry.subject, repository: entry.repository, href: "https://github.com/" + entry.repository,
      fileCount: data.files.length, modulesHref: href, area: entry.area, scoped: Boolean(entry.include),
    });
  }
  const stats = {
    repositories: unique.size,
    files: [...unique.values()].reduce((sum, paths) => sum + paths.size, 0),
    markers: markers.length,
  };
  if (empty.length) console.log("No eligible Lean files:", empty.join(", "));
  return { markers, stats };
}

// The main dataset is replaced atomically before retiring its old generated
// manifests. New module URLs are keyed by revision and scope, so a failed
// refresh leaves the previous dataset with a complete set of working links.
export async function retireProjectFiles(node, current) {
  if (!node) return;
  const old = node.externalProject?.modulesHref;
  if (old && !current.has(old) && /^\/roadmap-view\/projects\/[\w.-]+\.json$/.test(old)) {
    await unlink(join(outDir, old.split("/").pop())).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
  }
  for (const child of node.children ?? []) await retireProjectFiles(child, current);
}
