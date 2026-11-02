const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const yaml = require("js-yaml");

const generator = path.join(__dirname, "generate-atlas.js");
const websiteRoot = path.resolve(__dirname, "../..");

function fixture(check) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "physlib-atlas-test-"));
  try {
    const repo = path.join(root, "physlib");
    fs.mkdirSync(repo);
    const git = (...args) => execFileSync("git", ["-C", repo,
      "-c", "core.fsmonitor=false", "-c", "core.autocrlf=false",
      "-c", "user.name=Atlas migration test", "-c", "user.email=atlas@example.invalid",
      "-c", "commit.gpgsign=false", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    const write = (file, text) => {
      const target = path.join(repo, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, text);
    };
    const commit = (message) => { git("add", "-A"); git("commit", "-qm", message); return git("rev-parse", "HEAD"); };
    const generate = (ref, output = path.join(root, "preview.json"), script = generator) => {
      execFileSync(process.execPath, [script, "--repo", repo, "--ref", ref, "--branch", ref,
        ...(output ? ["--out", output] : [])], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
      return output ? JSON.parse(fs.readFileSync(output, "utf8")) : null;
    };
    git("init", "-q", "--initial-branch=master");
    const article = (title, reference) => `# ${title}\n\n## Abstract (Alpha)\n\nA short physics article.\n\n## Content (Alpha)\n\nA formalized claim. [1] A planned claim. [TODO] Related physics. {1}\n\n## Lean References\n\n1. Physlib/Time/Basic.lean — \`sampleValue\`\n\n## References\n\n1. ${reference}\n`;
    write("Physlib/Time/Basic.lean", "def sampleValue : Nat := 3\n");
    write("Physlib/Space/Basic.lean", "def spaceValue : Nat := 4\n");
    write("Physlib/Time/API-map.md", article("Time", "Space API map — Physlib/Space/API-map.md"));
    write("Physlib/Space/API-map.md", article("Space", "A textbook"));
    write("docs/API_MAP_GUIDE.md", "# Writing API maps\n");
    check({ root, repo, git, write, commit, generate, article });
  } finally {
    // Remove only the uniquely named fixture directly under the system temp directory.
    const resolved = fs.realpathSync(root);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith("physlib-atlas-test-"));
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

test("CLI reads coherent legacy, partial, renamed, and mixed Git revisions", () => fixture((f) => {
  const legacy = f.commit("Legacy articles");
  f.git("checkout", "-qb", "renamed");
  for (const area of ["Time", "Space"]) {
    fs.renameSync(path.join(f.repo, `Physlib/${area}/API-map.md`), path.join(f.repo, `Physlib/${area}/Atlas.md`));
  }
  const partial = f.commit("Rename articles before guide");
  fs.renameSync(path.join(f.repo, "docs/API_MAP_GUIDE.md"), path.join(f.repo, "docs/ATLAS_GUIDE.md"));
  f.write("Physlib/Time/Atlas.md", f.article("Time", "Space Atlas article — Physlib/Space/Atlas.md"));
  const renamed = f.commit("Rename guide and references");
  f.write("Physlib/Time/API-map.md", f.article("Stale duplicate", "A textbook"));
  const mixed = f.commit("Both filenames during transition");

  const scenarios = [
    ["master", legacy, "API-map.md", "docs/API_MAP_GUIDE.md"],
    [partial, partial, "Atlas.md", "docs/API_MAP_GUIDE.md"],
    [renamed, renamed, "Atlas.md", "docs/ATLAS_GUIDE.md"],
    ["renamed", mixed, "Atlas.md", "docs/ATLAS_GUIDE.md"],
  ];
  for (const [ref, sha, filename, guide] of scenarios) {
    const data = f.generate(ref);
    assert.equal(data.commit, sha);
    assert.equal(data.branch, ref);
    assert.equal(data.guideFile, guide);
    assert.equal(data.nodes.length, 2);
    const time = data.nodes.find((n) => n.path === "Physlib/Time");
    assert.equal(time.title, "Time");
    assert.equal(time.file, `Physlib/Time/${filename}`);
    assert.equal(time.parents[0].path, "Physlib/Space");
    assert.equal(time.parents[0].name, "Space");
    assert.equal(time.requirements.length, 2);
    assert.equal(time.requirements.filter((r) => r.done).length, 1);
    assert.equal(time.leanReferences[0].declarations[0].fullName, "sampleValue");
    assert.equal(time.url, `https://github.com/leanprover-community/physlib/blob/${sha}/${time.file}`);
    assert.ok(data.directories.find((d) => d.path === "Physlib/Time").hasAtlas);
    // Every article/guide link names a file present at the advertised immutable revision.
    for (const node of data.nodes) f.git("cat-file", "-e", `${sha}:${node.file}`);
    f.git("cat-file", "-e", `${sha}:${guide}`);
  }
  assert.equal(f.git("rev-parse", "HEAD"), mixed);
}));

test("a cached bare clone refreshes from legacy to Atlas sources without relying on its stale HEAD", () => fixture((f) => {
  const legacy = f.commit("Legacy master");
  const bare = path.join(f.root, "cached.git");
  f.git("clone", "--quiet", "--bare", f.repo, bare);
  const output = path.join(f.root, "cached-output.json");
  const refresh = () => {
    // The origin is this fixture's local repository; this test makes no network requests.
    execFileSync(process.execPath, [generator, "--repo", bare, "--out", output],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return JSON.parse(fs.readFileSync(output, "utf8"));
  };
  assert.equal(refresh().commit, legacy);
  for (const area of ["Time", "Space"]) {
    fs.renameSync(path.join(f.repo, `Physlib/${area}/API-map.md`), path.join(f.repo, `Physlib/${area}/Atlas.md`));
  }
  fs.renameSync(path.join(f.repo, "docs/API_MAP_GUIDE.md"), path.join(f.repo, "docs/ATLAS_GUIDE.md"));
  const renamed = f.commit("Atlas master");
  const data = refresh();
  assert.equal(data.commit, renamed);
  assert.equal(data.branch, "master");
  assert.equal(data.guideFile, "docs/ATLAS_GUIDE.md");
  assert.equal(data.nodes.length, 2);
  assert.ok(data.nodes.every((node) => node.file.endsWith("/Atlas.md")));
}));

test("the refresh workflow stages the CLI's actual default output and triggers its mirror", () => fixture((f) => {
  f.commit("Workflow source fixture");
  const staging = path.join(f.root, "website");
  const scripts = path.join(staging, "web2/scripts");
  fs.mkdirSync(scripts, { recursive: true });
  for (const file of ["generate-atlas.js", "lean-decls.js"]) fs.copyFileSync(path.join(__dirname, file), path.join(scripts, file));
  f.generate("master", null, path.join(scripts, "generate-atlas.js"));
  const workflow = yaml.load(fs.readFileSync(path.join(websiteRoot, ".github/workflows/atlas.yml"), "utf8"));
  const mirror = yaml.load(fs.readFileSync(path.join(websiteRoot, ".github/workflows/mirror-to-personal.yml"), "utf8"));
  const stage = workflow.jobs.generate.steps.find((s) => s.run?.includes("git add"));
  const stagedPath = stage.run.match(/git add (\S+)/)[1];
  const data = JSON.parse(fs.readFileSync(path.join(staging, stagedPath), "utf8"));
  assert.equal(data.nodes.length, 2);
  assert.ok(mirror.on.workflow_run.workflows.includes(workflow.name));
  const run = workflow.jobs.generate.steps.find((s) => s.run === "node scripts/generate-atlas.js");
  assert.equal(run["working-directory"], "web2");
}));
