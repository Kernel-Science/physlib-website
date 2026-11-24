import { setTimeout as delay } from 'node:timers/promises';
import { parseLean } from './lean-decls.js';
import { vertexOperatorAlgebras } from './roadmap-additional-projects.mjs';
import { catalogueProjects } from './roadmap-catalogue.mjs';
import { openAIProjects } from './roadmap-openai.mjs';

// Selected public Lean physics interfaces. Each module and every declaration's
// source-line link resolve to the same revision. Refresh only when
// rebuilding the website's roadmap snapshot.
const projects = [
  ...catalogueProjects,
  ...openAIProjects,
  vertexOperatorAlgebras,
  {
    repository: 'lecopivo/SciLean',
    revision: '95f8119a2884e9c41f82136523bd5568ea7075c5',
    subject: 'ClassicalMechanics',
    files: ['examples/HarmonicOscillator.lean'],
    moduleRoot: 'examples/',
    prefix: 'SciLean.',
    // This executable example defines H and a command-line entry point.
    names: new Set(['H']),
  },
  {
    repository: 'QuCompLean/QCLib',
    revision: '20dae29f5f4600907783fcb3d9dfaf98d05064d3',
    subject: 'QuantumInfo',
    // The Circuit subtree at this revision, including Gate and PauliGroup.
    files: [
      'QCLib/Circuit/CZ.lean',
      'QCLib/Circuit/Complexity.lean',
      'QCLib/Circuit/Embed.lean',
      'QCLib/Circuit/Gate/Bipartite.lean',
      'QCLib/Circuit/Gate/Qubit.lean',
      'QCLib/Circuit/Hadamard.lean',
      'QCLib/Circuit/PauliGroup/Generators.lean',
      'QCLib/Circuit/PauliGroup/Group.lean',
      'QCLib/Circuit/Permutation.lean',
      'QCLib/Circuit/QFT.lean',
    ],
  },
  {
    repository: 'xiyin137/OSreconstruction',
    revision: 'cf0904e34a7c146a9f312f601e3707dca4a87697',
    subject: 'QFT',
    moduleRoot: 'os-reconstruction/',
    // The Wightman interfaces and the package's public reconstruction results.
    files: [
      'OperatorDistribution', 'Reconstruction/Main', 'SchwartzTensorProduct',
      'SpectralCondition', 'SpectralEquivalence', 'WightmanAxioms',
    ].map(name => `os-reconstruction/OSReconstruction/Wightman/${name}.lean`),
  },
];

const theorems = new Set(['lemma', 'theorem']);
const definitions = new Set(['abbrev', 'def', 'structure', 'inductive', 'class']);

async function download(url) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
    if (response.ok) return response;
    if (response.status < 500 || attempt >= 2) {
      throw new Error(`Cannot read ${url} (HTTP ${response.status})`);
    }
    await response.body?.cancel();
    await delay(500 * 2 ** attempt);
  }
}

async function readModule(project, file) {
  const {repository, revision} = project;
  const source = await (await download(`https://raw.githubusercontent.com/${repository}/${revision}/${file}`)).text();
  const href = `https://github.com/${repository}/blob/${revision}/${file}`;
  const module = file.slice((project.moduleRoot || '').length, -'.lean'.length).replaceAll('/', '.');
  const decls = [];
  for (const declaration of parseLean(source).values()) {
    if (project.names && !project.names.has(declaration.name)) continue;
    if (!theorems.has(declaration.kind) && !definitions.has(declaration.kind)) continue;
    if (/\b(?:private|local)\b/.test(declaration.signature.split(declaration.kind + ' ')[0])) continue;
    decls.push({
      name: declaration.name,
      kind: theorems.has(declaration.kind) ? 'thm' : 'def',
      href: `${href}#L${declaration.line}`,
    });
  }
  return {path: `${project.subject}.${project.prefix || ''}${module}`, href, project: repository, module, decls};
}

export async function externalModules(audited = new Set()) {
  const files = projects.filter(project => !audited.has(project.repository))
    .flatMap(project => project.files.map(file => ({ project, file })));
  const modules = [];
  for (let i = 0; i < files.length; i += 8) {
    const batch = files.slice(i, i + 8);
    modules.push(...await Promise.all(batch.map(({ project, file }) => readModule(project, file))));
  }
  return modules;
}
