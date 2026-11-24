"""Publish the subject placements and exact source lines from the roadmap audit."""
import argparse
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import random
import re
import sqlite3
import tempfile
from urllib.parse import quote

from roadmap_placement import ReviewedFolders, REGISTRY

WEB = Path(__file__).resolve().parents[1]
DEFAULT_DB = WEB / "data/roadmap-audit/declarations.sqlite"
NATIVE_FOLDERS = WEB / "data/RoadmapNativeFolders.json"
OUT = WEB / "public/roadmap-view/declarations"
PREFIX = "/roadmap-view/declarations/"
STATEMENT_KINDS = {"lemma", "theorem", "axiom", "informal_lemma", "semiformal_result"}


def publish(path, value, compressed=False):
    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
    if compressed:
        raw = gzip.compress(raw, compresslevel=5, mtime=0)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(raw)
    tmp.replace(path)


def bucket(kind):
    # Match the two display families on the Roadmap. The exact source
    # keyword is separately retained for the detail panel and the audit.
    return "thm" if kind in STATEMENT_KINDS else "def"


class Group:
    def __init__(self, topic, repository):
        self.files = []
        self.counts = Counter()
        self.by_project = Counter()
        self.samples = defaultdict(list)
        self.rng = random.Random(topic + "/" + repository)
        self.file_ids = set()

    def sample(self, category, row, file):
        self.counts[category] += 1
        seen = self.counts[category]
        rows = self.samples[category]
        # Keep exact declarations distributed across source files, rather than
        # putting the first file's declarations across the whole overview.
        slot = len(rows) if len(rows) < 24 else self.rng.randrange(seen)
        if slot >= 24:
            return
        item = dict(row, path=file["path"], project=file["project"],
                    href=file["href"] + "#L" + str(row["line"]))
        if slot == len(rows):
            rows.append(item)
        else:
            rows[slot] = item


def validate_inventory(con, reviewed):
    registry = json.loads(REGISTRY.read_text())
    disk_revisions = set(con.execute("SELECT repository,revision FROM projects"))
    if {tuple(r) for r in disk_revisions} != reviewed.revisions:
        raise RuntimeError("Source database and registry revisions differ")
    paths = set()
    for row in registry:
        repo, revision = row["repository"], row["revision"]
        selectors = sorted(row.get("include", []))
        signature = json.dumps([2,repo,revision,selectors], ensure_ascii=False, separators=(",", ":"))
        key = hashlib.sha256(signature.encode()).hexdigest()
        name = "--".join([*repo.split("/"), row["subject"], key[:16]]) + ".json"
        manifest = json.loads((OUT.parent / "projects" / name).read_text())
        if (manifest["repository"], manifest["revision"], manifest["key"]) != (repo, revision, key):
            raise RuntimeError(f"{repo}: wrong public source inventory for {row['subject']}")
        for path in manifest["files"]:
            if selectors and not any(path == sel or (sel.endswith("/") and path.startswith(sel)) for sel in selectors):
                raise RuntimeError(f"{repo}: file outside registered scope: {path}")
            paths.add((repo, revision, path))
    actual = {tuple(r) for r in con.execute("SELECT repository,revision,path FROM roadmap_external_modules")}
    if actual != paths:
        sample = sorted(actual ^ paths)[:4]
        raise RuntimeError(f"Source database and registered file inventories differ: {sample}")
    missing_receipts = list(con.execute("""
        SELECT p.repository,p.revision FROM projects p LEFT JOIN files f ON f.project_id=p.id
        LEFT JOIN source_receipts r ON r.project_id=p.id GROUP BY p.id
        HAVING r.verified_files IS NULL OR r.verified_files<>count(f.id)
    """))
    if missing_receipts:
        raise RuntimeError("Incomplete pinned Git-blob verification: " + str([tuple(r) for r in missing_receipts]))


def previous_outputs(directory):
    """Follow the old index to the exact generated files it owned before switching indexes."""
    previous = directory / "index.json"
    if not previous.exists():
        return set()
    names = set()
    for topic in json.loads(previous.read_text())["topics"].values():
        for group in topic["groups"]:
            for key in ("href", "allFilesHref"):
                link = group.get(key, "")
                match = re.fullmatch(re.escape(PREFIX) + r"([pr][0-9a-f]{20}\.json)", link)
                if not match or match[1] in names:
                    continue
                name = match[1]
                names.add(name)
                manifest = directory / name
                if not manifest.exists():
                    continue
                for file in json.loads(manifest.read_text())["files"]:
                    batch = re.fullmatch(re.escape(PREFIX) + r"(d[0-9]+\.json\.gz)#[0-9]+-(?:[0-9]+|all)", file["declsHref"])
                    if batch:
                        names.add(batch[1])
    return names


def build_export(db, complete, staging):
    reviewed = ReviewedFolders.load()
    con = sqlite3.connect(f"file:{db.resolve()}?mode=ro", uri=True, timeout=60)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA temp_store=MEMORY")
    query = """
        SELECT p.repository, count(*) AS total,
               sum(f.status='audited' AND mp.module_id IS NOT NULL) AS ready
        FROM files f JOIN projects p ON p.id=f.project_id
        LEFT JOIN module_placements mp ON mp.module_id=f.id GROUP BY p.repository
    """
    coverage = list(con.execute(query))
    repos = {r["repository"] for r in coverage if r["ready"] == r["total"]}
    if not repos or (complete and len(repos) != len(coverage)):
        raise RuntimeError(f"Audited and placed {len(repos)} of {len(coverage)} repositories")
    if complete:
        if repos != set(reviewed.review):
            raise RuntimeError("Complete export requires every reviewed project and only reviewed projects")
        validate_inventory(con, reviewed)
    modrows = con.execute("""
        SELECT m.module_id,m.repository,m.revision,m.path,mp.public_topic AS topic FROM roadmap_external_modules m
        JOIN module_placements mp ON m.module_id=mp.module_id ORDER BY m.module_id
    """).fetchall()
    groups = {}
    homes = dict(con.execute("SELECT repository, topic FROM project_homes"))
    if any(homes.get(repo) != reviewed.homes[repo] for repo in repos) or (complete and set(homes) != repos):
        raise RuntimeError("Apply reviewed project homes before exporting")
    whole_projects = defaultdict(list)
    batch_num = None
    batch = {}
    files_by_topic = defaultdict(set)
    unique_records = 0
    cols = """SELECT d.name,d.kind,d.line,d.status,dp.public_topic FROM roadmap_external_declarations d
              LEFT JOIN declaration_placements dp ON dp.declaration_id=d.decl_id
              WHERE d.module_id=? ORDER BY d.line,d.decl_id"""
    for m in modrows:
        repo = m["repository"]
        if repo not in repos:
            continue
        ident = m["module_id"]
        number = ident // 64
        if number != batch_num and batch:
            publish(staging / f"d{batch_num}.json.gz", batch, compressed=True)
            batch = {}
        batch_num = number
        sections = defaultdict(list)
        for name, kind, line, status, topic in con.execute(cols, (ident,)):
            # An anonymous Lean example is retained in the audit database.
            # It has no named result for a reader to open in the roadmap.
            if kind == "example":
                continue
            destination = m["topic"] if topic is None else topic
            if destination not in reviewed.folders:
                raise RuntimeError(f"{repo}: invalid public placement for {m['path']}: {destination}")
            sections[destination].append(dict(name=name, kind=kind, line=line, status=status))
        file_records = []
        for part, (topic, records) in enumerate(sorted(sections.items())):
            key = f"{ident}-{part}"
            batch[key] = {"declarations": records}
            # A repository has one named home. In other topics its declarations
            # join the topic's own files, with the project credited on each row.
            project_home = repo if homes[repo] == topic else ""
            group = groups.get((topic, project_home))
            if group is None:
                group = groups[topic, project_home] = Group(topic, project_home)
            path = m["path"]
            link = f"https://github.com/{repo}/blob/{m['revision']}/{quote(path)}"
            counts = Counter()
            file = {"name": path.rsplit("/", 1)[-1], "path": path, "project": repo,
                    "href": link, "count": len(records), "declsHref": f"{PREFIX}d{number}.json.gz#{key}"}
            for record in records:
                category = bucket(record["kind"])
                group.sample(category, record, file)
                counts[category] += 1
            file["counts"] = {k: counts[k] for k in ("def", "thm", "other")}
            group.files.append(file)
            group.by_project[repo] += len(records)
            file_records.append(file)
            group.file_ids.add(ident)
            files_by_topic[topic].add(ident)
            unique_records += len(records)
        if len(file_records) == 1:
            whole_projects[repo].append(file_records[0])
        elif file_records:
            key = f"{ident}-all"
            all_rows = sorted((row for rows in sections.values() for row in rows), key=lambda row: row["line"])
            batch[key] = {"declarations": all_rows}
            counts = Counter(bucket(row["kind"]) for row in all_rows)
            whole_projects[repo].append(dict(file_records[0], count=len(all_rows),
                counts={k: counts[k] for k in ("def", "thm", "other")},
                declsHref=f"{PREFIX}d{number}.json.gz#{key}"))
    if batch:
        publish(staging / f"d{batch_num}.json.gz", batch, compressed=True)
    topics = {}
    for (topic, repo), group in sorted(groups.items()):
        slug = hashlib.sha256((topic + "/" + repo).encode()).hexdigest()[:20]
        name = f"p{slug}.json"
        publish(staging / name, {"files": sorted(group.files, key=lambda f: (f["project"], f["path"]))})
        index = topics.setdefault(topic, {"count": 0, "files": len(files_by_topic[topic]), "groups": []})
        count = sum(group.counts.values())
        index["count"] += count
        identity = {"inline": True, "label": ""} if not repo else {
            "primary": True, "label": repo.split("/")[-1], "project": repo}
        if repo:
            all_name = "r" + hashlib.sha256(repo.encode()).hexdigest()[:20] + ".json"
            all_files = sorted(whole_projects[repo], key=lambda f: f["path"])
            publish(staging / all_name, {"files": all_files})
            identity.update(allFilesHref=PREFIX + all_name, totalCount=sum(f["count"] for f in all_files))
        index["groups"].append({**identity, "count": count, "byProject": dict(sorted(group.by_project.items())),
                                "files": len(group.file_ids), "href": PREFIX + name,
                                "counts": {k: group.counts[k] for k in ("def", "thm", "other")},
                                "samples": [row for k in ("def", "thm", "other") for row in group.samples[k]]})
    index = {"repositories": sorted(repos), "fileCount": sum(r["ready"] for r in coverage if r["repository"] in repos),
             "declarationCount": unique_records, "topics": topics}
    if complete:
        expected = con.execute("SELECT count(*) FROM declarations WHERE kind <> 'example'").fetchone()[0]
        if expected != unique_records:
            raise RuntimeError(f"Expected {expected} declaration rows, exported {unique_records}")
        primary_homes = {repo: topic for topic, repo in groups if repo}
        if primary_homes != homes:
            raise RuntimeError(f"Missing populated reviewed homes: {sorted(set(homes.items()) - set(primary_homes.items()))}")
    publish(staging / "index.json", index)
    con.close()
    print(f"{len(repos)} repositories, {index['fileCount']} audited files, {unique_records} plotted declarations, {len(topics)} topics")


def export(db, complete):
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".roadmap-export-", dir=OUT.parent) as temp:
        staging = Path(temp)
        build_export(db, complete, staging)
        previous = previous_outputs(OUT)
        current = {path.name for path in staging.iterdir()}
        for name in sorted(current - {"index.json"}):
            (staging / name).replace(OUT / name)
        (staging / "index.json").replace(OUT / "index.json")
        for name in previous - current:
            (OUT / name).unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--complete", action="store_true", help="require a full audit and placement before exporting")
    args = parser.parse_args()
    export(args.db, args.complete)
