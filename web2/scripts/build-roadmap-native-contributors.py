"""Build the native Roadmap contributor index from the pinned Physlib Git history.

Run from web2 with Python 3, git, and an authenticated GitHub CLI:
  python3 scripts/build-roadmap-native-contributors.py --repo /path/to/physlib
A complete bare or working clone containing RoadmapNativeFolders.revision is sufficient.
"""

import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from email.utils import parseaddr
import json
from pathlib import Path
import re
import subprocess
from roadmap_audit import NESTED, SPECIAL, blank


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/RoadmapNativeFolders.json'
OUTPUT = ROOT / 'public/roadmap-view/native-contributors.json'


# Each of these PRs was submitted from @kastch’s own fork. Every original commit
# in all 18 PRs (48 commits) has the sole Git identity kastch <kastch>. The squash
# is already credited to the verified @kastch profile; GitHub repeated the local
# identity in its trailer. This exception applies only to these exact squash commits.
# Original commits: https://github.com/leanprover-community/physlib/pull/1203/commits
KASTCH_SQUASHES = {
    'e7aa84a61e38160bfa327f7b9967b48b17e1117e',  # PR 1203
    '52d43de07f8d2b34aa0c3a01af0700ee9ff8d45a',  # PR 1186
    '3e49bea14cc238bc4ee5e03f36619765df0c7f36',  # PR 1181
    'ede623da538ba7d5a647763211889c2cc8d0c30b',  # PR 1179
    'cd41ac6eb637d91eb714754a62c2603b779e0ec5',  # PR 1168
    'a595353c6aca8d65e1d50ce6d9193102732be3d5',  # PR 1161
    'aeb706d5a729ab24978941c2fc265141c0773b0e',  # PR 1158
    'e7a5ef0bda2addc810e08c905132a001256f41cd',  # PR 1007
    '9b240de5bc880ea640ead22c207e79ad2cf50fb8',  # PR 948
    'f86c41afd23f2491adfcd3896d76be27ddc2a715',  # PR 944
    'ce250da39d6582249b2ea3c4a0b8ce048d18edb6',  # PR 935
    '5656416627e54038bbee90e9c35294c8bf048d51',  # PR 934
    '7ba876c3f5fcd9f67fa2ee9326dd5d0b1e70079a',  # PR 922
    '9aa1f3142e8d101f1e172a36e7e880ef2c4953b4',  # PR 921
    '6cd4ff17bab069314e067c014d91003fbd7fae7c',  # PR 920
    '977833b1b75fd77da39f3119775552accea14adc',  # PR 919
    '901256f34bada179a80d0ab2633bf8a852490e52',  # PR 903
    '4adeb42cb879d6ca4d6f97a8f93ad6af2df6523c',  # PR 902
}


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True)


def write_json(path, value):
    data = json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n'
    temp = path.with_suffix('.tmp')
    temp.write_text(data, encoding='utf-8')
    temp.replace(path)


def file_histories(repo, rev, files, cache):
    if git(repo, 'rev-parse', '--is-shallow-repository').strip() != 'false':
        raise ValueError('A complete Git history is required. This repository is shallow.')
    if git(repo, 'rev-parse', '--verify', rev + '^{commit}').strip() != rev:
        raise ValueError('The pinned commit is missing from the source repository.')
    known = set(git(repo, 'ls-tree', '-r', '--name-only', '-z', rev).split('\0'))
    missing = set(files) - known
    if missing:
        raise ValueError(f'Native manifest paths missing at {rev}: {sorted(missing)[:3]}')
    if cache.exists():
        saved = json.loads(cache.read_text())
        if set(saved) == set(files) and all(saved.values()):
            return saved

    def history(path):
        # One exact file at a time lets Git trace its provenance through renames.
        commits = git(repo, 'log', '--follow', '--format=%H', rev, '--', path).splitlines()
        if not commits:
            raise ValueError(f'No Git history found for {path}')
        return path, commits

    with ThreadPoolExecutor(max_workers=6) as pool:
        histories = dict(pool.map(history, files))
    write_json(cache, histories)
    return histories


def uncomment(text):
    """Mask Lean line and nested block comments, keeping literal text and line positions."""
    parts = []
    start = pos = 0
    while match := SPECIAL.search(text, pos):
        token = match[0]
        pos = match.end()
        if token == '/-':
            depth = 1
            for boundary in NESTED.finditer(text, pos):
                depth += 1 if boundary[0] == '/-' else -1
                if not depth:
                    pos = boundary.end()
                    break
            else:
                pos = len(text)
        elif token.startswith('r') and token.endswith('"'):
            if match.start() and (text[match.start() - 1].isalnum() or text[match.start() - 1] == '_'):
                pos = match.start() + 1
                continue
            delimiter = '"' + (match[1] or '')
            end = text.find(delimiter, pos)
            pos = len(text) if end < 0 else end + len(delimiter)
            continue
        elif not token.startswith('--'):
            continue
        parts.extend((text[start:match.start()], blank(text[match.start():pos])))
        start = pos
    return ''.join((*parts, text[start:]))


def blamed_lines(repo, rev, path):
    authors = []
    lines = []
    commit = None
    for line in git(repo, 'blame', '--root', '--porcelain', rev, '--', path).split('\n'):
        if line.startswith('\t'):
            if not commit:
                raise ValueError(f'Missing blame attribution for {path} line {len(lines) + 1}')
            authors.append(commit)
            lines.append(line[1:])
            commit = None
        elif match := re.fullmatch(r'([0-9a-f]{40}) \d+ (\d+)(?: \d+)?', line):
            if int(match[2]) != len(lines) + 1:
                raise ValueError(f'Unexpected blame line order for {path}')
            commit = match[1]
    code = uncomment('\n'.join(lines)).split('\n') if lines else []
    if len(code) != len(authors):
        raise ValueError(f'Comment scanner changed line count for {path}')
    return path, dict(Counter(owner for owner, line in zip(authors, code) if line.strip()))


def file_blames(repo, rev, files, cache):
    if cache.exists():
        saved = json.loads(cache.read_text())
        if set(saved) == set(files):
            return saved
    with ThreadPoolExecutor(max_workers=6) as pool:
        counts = dict(pool.map(lambda path: blamed_lines(repo, rev, path), files))
    write_json(cache, counts)
    return counts


def read_authors(repo, rev, included):
    fmt = '%H%x1f%an%x1f%ae%x1f%(trailers:key=Co-authored-by,valueonly,separator=%x1d)%x00'
    records = git(repo, 'log', '--format=' + fmt, rev).split('\0')
    credits = {}
    primary = {}
    samples = {}
    spellings = defaultdict(Counter)
    for record in records:
        if not record.strip():
            continue
        commit, name, email, trailers = record.strip('\n').split('\x1f')
        if commit not in included:
            continue
        authors = [(name, email), *[parseaddr(t) for t in trailers.split('\x1d') if t]]
        primary[commit] = email.strip().lower() or 'name:' + name
        credited = set()
        for position, (display, address) in enumerate(authors):
            if not display and not address:
                continue
            address = address.strip().lower()
            identity = address or 'name:' + display
            credited.add(identity)
            if display.strip() and '@' not in display:
                spellings[identity][display.strip()] += 1
            # Prefer a primary author record to a trailer as evidence of a linked account.
            if identity not in samples or (position == 0 and samples[identity][1] != 0):
                samples[identity] = (commit, position)
        credits[commit] = credited
    if set(credits) != included:
        raise ValueError('Incomplete commit metadata for native files.')
    return credits, primary, spellings, samples


def github_accounts(repository, samples):
    # GitHub resolves authors of these exact commits to linked profiles. This
    # deliberately does not search for accounts by a similar name or email.
    owner, project = repository.split('/')
    hashes = sorted({commit for commit, _ in samples.values()})
    found = {}
    for offset in range(0, len(hashes), 16):
        batch = hashes[offset:offset + 16]
        objects = ' '.join(
            f'c{i}:object(oid:"{sha}"){{... on Commit{{authors(first:100){{totalCount nodes{{email user{{login name}}}}}}}}}}'
            for i, sha in enumerate(batch)
        )
        query = f'query{{repository(owner:{json.dumps(owner)},name:{json.dumps(project)}){{{objects}}}}}'
        raw = subprocess.check_output(['gh', 'api', 'graphql', '-f', 'query=' + query], text=True)
        records = json.loads(raw)['data']['repository']
        for i, sha in enumerate(batch):
            authors = records[f'c{i}']['authors']
            if authors['totalCount'] != len(authors['nodes']):
                raise ValueError(f'Incomplete author list for {sha}')
            for person in authors['nodes']:
                address = (person.get('email') or '').lower()
                profile = person.get('user')
                if profile and address in samples:
                    prior = found.get(address)
                    if prior and prior['login'].casefold() != profile['login'].casefold():
                        raise ValueError('Conflicting GitHub accounts for the same Git identity.')
                    found[address] = profile
    return found


def build_index(repository, revision, histories, blame, credits, primary, spellings, accounts):
    for commit in KASTCH_SQUASHES.intersection(credits):
        if accounts.get(primary[commit], {}).get('login') == 'kastch':
            credits[commit].discard('kastch')

    people = defaultdict(Counter)
    profile_names = {}
    logins = {}
    identities = {}
    for identity in {key for group in credits.values() for key in group}:
        profile = accounts.get(identity) or {}
        login = profile.get('login')
        if (login and login.lower().endswith('[bot]')) or '[bot]@' in identity:
            continue
        # Unlinked author identities may still be credited with a public display name.
        names = spellings[identity]
        if not login and not names:
            continue
        key = 'gh:' + login.casefold() if login else 'git:' + identity
        people[key].update(names)
        public_name = (profile.get('name') or '').strip()
        if public_name and '@' not in public_name:
            profile_names[key] = public_name
        logins[key] = login
        identities[identity] = key

    def name(key):
        if key in profile_names:
            return profile_names[key]
        names = people[key]
        if not names:
            return logins[key]
        return min(names, key=lambda s: (-names[s], s.casefold(), s))

    keys = sorted(people, key=lambda key: (name(key).casefold(), key))
    ids = {key: i for i, key in enumerate(keys)}
    people_by_commit = {
        commit: {ids[identities[e]] for e in emails if e in identities} for commit, emails in credits.items()
    }
    paths = defaultdict(set)
    loc = defaultdict(Counter)
    excluded = Counter()
    for file, commits in histories.items():
        ids_for_file = set().union(*(people_by_commit[c] for c in commits))
        for commit, lines in blame[file].items():
            key = identities.get(primary[commit])
            if key is None:
                excluded[file] += lines
            else:
                loc[file][ids[key]] += lines
        ids_for_file.update(loc[file])
        paths[file] = ids_for_file
        for folder in Path(file).parents:
            if folder != Path('.'):
                directory = folder.as_posix()
                paths[directory].update(ids_for_file)
                loc[directory].update(loc[file])
                excluded[directory] += excluded[file]
    ranked = {path: sorted(paths[path], key=lambda i: (-loc[path][i], i)) for path in sorted(paths)}
    return {
        'repository': repository,
        'revision': revision,
        'method': 'Git authors and Co-authored-by trailers on git log --follow for each currently indexed .lean file at this revision. Folder lists are unions of descendant file lists. GitHub resolves linked profiles from commit authors. Recognized GitHub bots are excluded.',
        'locMethod': 'Current nonblank Lean lines containing code outside comments, attributed once to the primary author of the commit reported by git blame at the pinned revision. Strings and attributes count as code. Folder counts sum descendant .lean files. Historical contributors can have zero surviving lines.',
        'names': [name(key) for key in keys],
        'logins': [logins[key] for key in keys],
        'paths': ranked,
        'loc': {path: [loc[path][i] for i in indices] for path, indices in ranked.items()},
        'excludedLoc': {path: count for path, count in sorted(excluded.items()) if count},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, required=True)
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text())
    revision = manifest['revision']
    if not re.fullmatch('[0-9a-f]{40}', revision):
        raise ValueError('The native layout must pin a full Git commit.')
    cache = ROOT / '.cache/roadmap-native-contributors' / revision
    cache.mkdir(parents=True, exist_ok=True)
    history = file_histories(args.repo, revision, manifest['files'], cache / 'history.json')
    blame = file_blames(args.repo, revision, manifest['files'], cache / 'code-blame-v1.json')
    commits = {c for group in history.values() for c in group} | {c for counts in blame.values() for c in counts}
    credits, primary, spellings, samples = read_authors(args.repo, revision, commits)
    accounts = github_accounts(manifest['repository'], samples)
    index = build_index(manifest['repository'], revision, history, blame, credits, primary, spellings, accounts)
    write_json(OUTPUT, index)
    print(f"Indexed {len(history)} native files from {len(commits)} contributing commits; "
          f"{sum(bool(x) for x in index['logins'])} of {len(index['names'])} identities link to GitHub.")


if __name__ == '__main__':
    main()
