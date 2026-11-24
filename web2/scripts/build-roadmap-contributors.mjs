// Refresh repo-wide GitHub contributor lists independently of Lean source pins.
// Requires the GitHub CLI. In CI set GH_TOKEN to the workflow's read token.
import { execFile } from "node:child_process";
import { readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";
import { promisify } from "node:util";
const gh = promisify(execFile);
const registry = JSON.parse(await readFile(new URL("./roadmap-project-registry.json", import.meta.url)));
const repositories = [...new Set(["leanprover-community/physlib", ...registry.map(x => x.repository.toLowerCase())])].sort();

async function contributors(repository) {
  const api = "repos/" + repository + "/contributors?per_page=100";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const {stdout} = await gh("gh", ["api", api, "--paginate", "--slurp", "--cache", "1h"], {maxBuffer: 8*1024*1024});
      const pages = JSON.parse(stdout);
      if (!Array.isArray(pages) || !pages.every(Array.isArray)) throw new Error("unexpected-response");
      const people = new Map();
      const bots = new Set();
      for (const {id,type,login} of pages.flat()) {
        if (!Number.isSafeInteger(id) || !login) continue;
        if (type === "Bot" || /\[bot\]$/i.test(login)) bots.add(id);
        else if (type === "User") people.set(id, login);
      }
      const logins = [...people.values()].sort((a, b) => a.localeCompare(b, "en"));
      return {count: logins.length, excludedBots: bots.size, logins};
    } catch (err) {
      const reason = err.stderr?.match(/HTTP (\d+)/)?.[1] || "request-failed";
      if (attempt === 3 || reason === "404" || reason === "451") return {count:null,reason};
      await wait((attempt+1)*1000);
    }
  }
}
const values = new Map();
let next = 0;
async function worker() {
  while (next < repositories.length) {
    const repository = repositories[next++];
    values.set(repository, await contributors(repository));
  }
}
await Promise.all(Array.from({length: 5}, worker));
const failed = repositories.filter(repo => values.get(repo).count === null);
if (failed.length) {
  throw new Error("Contributor snapshot refresh incomplete: " +
    failed.map(repo => repo + " (" + values.get(repo).reason + ")").join(", "));
}
const observedAt = new Date().toISOString();
const snapshot = {
  observedAt,
  source: "https://docs.github.com/en/rest/repos/repos#list-repository-contributors",
  scope: "Repository-wide GitHub contributor listing at observation time on the default branch",
  method: "List public GitHub usernames for unique linked User account IDs across all pages. Exclude GitHub Bot accounts and [bot] logins. Unlinked authors are omitted. GitHub caches contributor data and links only the first 500 author email addresses. The listing does not identify which contributors authored the selected Lean files.",
  repositories: Object.fromEntries(repositories.map(repo => [repo,values.get(repo)])),
};
const output = new URL("../public/roadmap-view/contributors.json", import.meta.url);
const tmp = new URL("contributors." + process.pid + ".tmp", output);
await writeFile(tmp, JSON.stringify(snapshot) + "\n");
await rename(tmp, output);
console.log(repositories.length + " repository contributor lists observed " + observedAt);
