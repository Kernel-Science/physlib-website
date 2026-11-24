"""Index explicit native Lean declarations at the same Git revision as the Roadmap.

Run from web2 with Python 3:
  python3 scripts/build-roadmap-native-declarations.py [--repo /path/to/physlib]
An available local clone supplies the source files; otherwise use GitHub's pinned archive.
"""

import argparse
from contextlib import contextmanager
import json
from pathlib import Path
import re
import subprocess
import tarfile
import urllib.request

from roadmap_audit import MODS, declarations


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/RoadmapNativeFolders.json'
OUTPUT = ROOT / 'data/RoadmapNativeDeclarations.json'
LIBRARIES = {'Physlib', 'PhyslibAlpha', 'QuantumInfo'}
FORMAL_KINDS = {
    'def', 'theorem', 'lemma', 'abbrev', 'instance', 'structure', 'class',
    'inductive', 'class inductive', 'class abbrev', 'coinductive', 'opaque', 'axiom', 'constant', 'alias',
}
ALIAS_COMMAND = re.compile(r'^([ \t]*' + MODS + r')(class[ \t]+abbrev|alias)\b')


def formal_declarations(source):
    # The shared source parser handles named commands and their namespaces.
    # Class abbreviations and named aliases have the same name position as abbrev.
    original_kinds = {}
    lines = source.splitlines(keepends=True)
    for index, line in enumerate(lines):
        if match := ALIAS_COMMAND.match(line):
            original_kinds[index + 1] = ' '.join(match[2].split())
            lines[index] = match[1] + 'abbrev' + line[match.end():]
    rows, _ = declarations(''.join(lines))
    records = []
    for line, name, kind, _, _ in rows:
        if kind not in FORMAL_KINDS:
            continue
        if name.endswith('«anonymous instance»'):
            # This is a source label, not the generated Lean environment name.
            name = name.removesuffix('«anonymous instance»') + f'«anonymous instance at line {line}»'
        records.append([name, original_kinds.get(line, kind), line])
    return records


@contextmanager
def archive(repo, repository, revision):
    if repo:
        command = ['git', '-C', str(repo), 'archive', '--format=tar', revision]
        with subprocess.Popen(command, stdout=subprocess.PIPE) as process:
            try:
                with tarfile.open(fileobj=process.stdout, mode='r|') as source:
                    yield source, ''
            finally:
                process.stdout.close()
            if process.wait():
                raise RuntimeError(f'git archive failed for {revision}')
    else:
        url = f'https://codeload.github.com/{repository}/tar.gz/{revision}'
        request = urllib.request.Request(url, headers={'User-Agent': 'Physlib-website-roadmap'})
        with urllib.request.urlopen(request, timeout=120) as response, tarfile.open(fileobj=response, mode='r|gz') as source:
            yield source, f'{repository.rsplit("/", 1)[-1]}-{revision}/'


def build(repo, manifest):
    repository, revision = manifest['repository'], manifest['revision']
    if not re.fullmatch(r'[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+', repository) or not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('The native folder inventory must specify a repository and full Git revision.')
    expected = set(manifest['files'])
    files = {}
    with archive(repo, repository, revision) as (source, prefix):
        for entry in source:
            if not entry.isfile() or not entry.name.startswith(prefix):
                continue
            path = entry.name[len(prefix):]
            if not path.endswith('.lean') or path.split('/')[0].removesuffix('.lean') not in LIBRARIES:
                continue
            if path not in expected or path in files:
                raise ValueError(f'Unexpected or duplicate native Lean file in pinned archive: {path}')
            files[path] = formal_declarations(source.extractfile(entry).read().decode('utf-8-sig'))
    if files.keys() != expected:
        raise ValueError(f'Missing native Lean files in pinned archive: {sorted(expected - files.keys())[:4]}')
    return {
        'repository': repository,
        'revision': revision,
        'method': 'Explicit declaration commands in each pinned Lean source, with syntax-level names, original kind and one-based source line. Includes private declarations, axioms and instances (anonymous instances have source-line labels). Excludes examples, informal or semiformal placeholders and compiler-generated auxiliaries. This count does not certify completion of proofs.',
        'files': dict(sorted(files.items())),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, help='Path to a local Git repository containing the pinned commit')
    args = parser.parse_args()
    cached = ROOT / '.cache/physlib-roadmap-current.git'
    repo = args.repo or (cached if cached.is_dir() else None)
    index = build(repo, json.loads(MANIFEST.read_text()))
    tmp = OUTPUT.with_suffix('.tmp')
    tmp.write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    tmp.replace(OUTPUT)
    print(f"Indexed {sum(map(len, index['files'].values()))} source declarations across {len(index['files'])} native Lean files at {index['revision']}.")


if __name__ == '__main__':
    main()
