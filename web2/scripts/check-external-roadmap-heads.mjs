// Read the published inventories and report upstream movement without updating any pins.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read = url => JSON.parse(readFileSync(new URL(url, import.meta.url), 'utf8'));
const registry = read('./roadmap-project-registry.json');
const published = read('../public/roadmap-view/roadmap-data.json').projects;
const scopes = new Map(published.map(entry => [entry.repository.toLowerCase() + '/' + entry.subject, entry]));
const projects = new Map();
const issues = [];

for (const { repository, subject, revision } of registry) {
  const repo = repository.toLowerCase();
  if (!projects.has(repo)) projects.set(repo, { repository, pins: new Map(), incomplete: false });
  const project = projects.get(repo);
  const key = repo + '/' + subject;
  const entry = scopes.get(key);
  scopes.delete(key);
  if (!entry) {
    issues.push(`${repository} (${subject}) has no published inventory.`);
    project.incomplete = true;
    continue;
  }
  const file = entry.modulesHref.split('/').pop();
  let inventory;
  try {
    inventory = read('../public/roadmap-view/projects/' + file);
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  if (inventory?.repository?.toLowerCase() !== repo || !/^[a-f0-9]{40}$/.test(inventory.revision)) {
    issues.push(`${repository} (${subject}) has a missing or invalid published inventory.`);
    project.incomplete = true;
    continue;
  }
  if (inventory.revision !== revision) {
    issues.push(`${repository} (${subject}) has registry pin \`${revision.slice(0, 8)}\` and published inventory \`${inventory.revision.slice(0, 8)}\`.`);
  }
  const { pins } = project;
  if (!pins.has(inventory.revision)) pins.set(inventory.revision, []);
  pins.get(inventory.revision).push(subject);
}
for (const entry of scopes.values()) issues.push(`${entry.repository} (${entry.subject}) has a published inventory without a registry entry.`);

const changes = [], unavailable = [];
let current = 0, incomplete = 0, failed = false;
const entries = [...projects.values()].sort((a, b) => a.repository.localeCompare(b.repository, 'en'));
for (let start = 0; start < entries.length; start += 40) {
  const batch = entries.slice(start, start + 40);
  const fields = batch.map(({ repository }, i) => {
    const [owner, name] = repository.split('/').map(value => JSON.stringify(value));
    return `r${i}:repository(owner:${owner},name:${name}){defaultBranchRef{target{oid}}}`;
  });
  let payload;
  try {
    const result = execFileSync('gh', ['api', 'graphql', '-f', 'query=query{' + fields.join(' ') + '}'],
      { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
    payload = JSON.parse(result);
  } catch (error) {
    // A missing repository makes gh exit 1 even when other aliases return valid heads.
    try { payload = JSON.parse(error.stdout); } catch { /* No usable response for this batch. */ }
  }
  const errors = payload?.errors ?? [];
  if (!payload?.data || errors.some(error => !error.path?.length)) failed = true;
  for (const [i, project] of batch.entries()) {
    const { repository, pins } = project;
    const alias = 'r' + i;
    const head = payload?.data?.[alias]?.defaultBranchRef?.target?.oid;
    const url = 'https://github.com/' + repository;
    if (!/^[a-f0-9]{40}$/.test(head)) {
      const error = errors.find(item => item.path?.[0] === alias);
      const missing = error?.type === 'NOT_FOUND' || error?.type === 'FORBIDDEN';
      const empty = payload?.data?.[alias]?.defaultBranchRef === null;
      if (!missing && !empty) failed = true;
      unavailable.push(`- [${repository}](${url}) — ${missing ? 'Repository unavailable' : empty ? 'No default branch' : 'GitHub request incomplete'}.`);
      continue;
    }
    const differing = [...pins].filter(([pin]) => pin !== head);
    if (differing.length) {
      const links = differing.map(([pin, subjects]) => {
        const label = `[${pin.slice(0, 8)} → ${head.slice(0, 8)}](${url}/compare/${pin}...${head})`;
        return pins.size > 1 ? label + ' (' + subjects.join(', ') + ')' : label;
      });
      changes.push(`- [${repository}](${url}) — ${links.join(', ')}`);
    } else if (project.incomplete) incomplete++;
    else current++;
  }
}

console.log(['## External Roadmap Audit', '',
  `Checked ${projects.size} repositories against their published inventories. ${changes.length} changed, ${current} matched, and ${unavailable.length} upstream heads were unavailable.`,
  ...(incomplete ? [`${incomplete} could not be compared across all their scopes because of incomplete inventories.`] : []),
  ...(!changes.length ? [] : ['', '### Changed Default-Branch Heads', '', ...changes]),
  ...(!unavailable.length ? [] : ['', '### Unavailable', '', ...unavailable]),
  ...(!issues.length ? [] : ['', '### Inventory Discrepancies', '', ...issues.map(issue => '- ' + issue)]),
  '', 'Review the comparisons before updating an audit pin. The report leaves the published snapshot in place.',
].join('\n'));
if (failed || issues.length) process.exitCode = 1;
