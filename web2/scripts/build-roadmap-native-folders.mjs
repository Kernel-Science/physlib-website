// Snapshot Physlib's source layout at the same commit as this site's API maps.
// Run from web2: node scripts/build-roadmap-native-folders.mjs [--repo PATH]
// A checked-out or bare clone is preferred. A clean checkout can refresh
// directly from GitHub's pinned, complete Git tree.
import { execFile } from 'node:child_process';
import { readFile, rename, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const git = promisify(execFile);
const root = new URL('../', import.meta.url);
const source = JSON.parse(await readFile(new URL('data/APIMap.json', root)));
const {repo: repository, commit: revision} = source;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !/^[0-9a-f]{40}$/.test(revision)) {
  throw new Error('APIMap.json must specify a GitHub repository and a full Git commit.');
}
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--repo')) {
  throw new Error('Usage: node scripts/build-roadmap-native-folders.mjs [--repo PATH]');
}

async function pinnedFiles() {
  const candidates = args.length ? [resolve(args[1])] : [
    fileURLToPath(new URL('.cache/physlib-roadmap-current.git', root)),
    fileURLToPath(new URL('.cache/physlib.git', root)),
  ];
  for (const repo of candidates) {
    try {
      const {stdout} = await git('git', ['-C', repo, 'ls-tree', '-r', '-z', revision], {maxBuffer: 32*1024*1024});
      return stdout.split('\0').flatMap(row => {
        const parts = /^100(?:644|755) blob [a-f0-9]+\t([\s\S]+)$/.exec(row);
        return parts ? [parts[1]] : [];
      });
    } catch (error) {
      if (args.length) throw error;
    }
  }
  const headers = {Accept: 'application/vnd.github+json'};
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  const response = await fetch('https://api.github.com/repos/' + repository + '/git/trees/' + revision + '?recursive=1', {
    headers, redirect: 'error', signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error('Could not fetch native Git tree (HTTP ' + response.status + ')');
  const data = await response.json();
  if (data.truncated) throw new Error('GitHub returned an incomplete tree; use --repo with a local clone.');
  return data.tree.filter(x => x.type === 'blob' && /^100(?:644|755)$/.test(x.mode)).map(x => x.path);
}

const paths = await pinnedFiles();
const roots = new Set(['Physlib', 'PhyslibAlpha', 'QuantumInfo']);
const folders = new Map();
const quantumInfoFolders = new Set();
const files = [];
for (const path of paths) {
  const [library, ...relative] = path.split('/');
  if (!relative.length) {
    if (path.endsWith('.lean') && roots.has(path.slice(0, -5))) files.push(path);
    continue;
  }
  if (!roots.has(library)) continue;
  const filename = relative.pop();
  const code = filename.endsWith('.lean'), article = filename === 'API-map.md';
  if (!code && !article) continue;
  if (code) files.push(path);
  if (library === 'QuantumInfo') {
    quantumInfoFolders.add(library);
    for (let i = 1; i <= relative.length; i++) quantumInfoFolders.add([library, ...relative.slice(0, i)].join('/'));
    continue;
  }
  for (let i = 1; i <= relative.length; i++) {
    const key = relative.slice(0, i).join('.');
    if (!folders.has(key)) folders.set(key, {path: key, libraries: new Set(), apiMaps: new Set()});
    const folder = folders.get(key);
    if (code) folder.libraries.add(library);
    if (article && i === relative.length) folder.apiMaps.add(library);
  }
}
// A rename is recorded only if an upstream commit explicitly reported that
// previous filename and the destination still exists at this snapshot's pin.
// Consumers keep the original Verso URL even when placing the file at its new home.
const renameEvidence = JSON.parse(await readFile(new URL('scripts/roadmap-native-renames.json', root)));
const nativeFiles = new Set(files);
const formerFiles = Object.fromEntries(Object.entries(renameEvidence)
  .filter(([old, {current}]) => !nativeFiles.has(old) && nativeFiles.has(current))
  .map(([old, {current}]) => [old, current]));
const snapshot = {
  repository, revision,
  folders: [...folders.keys()].sort().map(path => {
    const node = folders.get(path);
    return {path, libraries: [...node.libraries].sort(), apiMaps: [...node.apiMaps].sort()};
  }),
  quantumInfoFolders: [...quantumInfoFolders].sort(),
  files: files.sort(), formerFiles,
};
const output = new URL('data/RoadmapNativeFolders.json', root);
const tmp = new URL('data/RoadmapNativeFolders.' + process.pid + '.tmp', root);
await writeFile(tmp, JSON.stringify(snapshot, null, 2) + '\n');
await rename(tmp, output);
console.log(snapshot.folders.length + ' Physlib/PhyslibAlpha directories, ' + quantumInfoFolders.size + ' QuantumInfo directories, ' +
  files.length + ' Lean files at ' + revision + '.');
