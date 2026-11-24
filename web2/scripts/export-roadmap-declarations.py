"""Publish the subject placements and exact source lines from the roadmap audit."""
import argparse
from collections import Counter, defaultdict
from functools import cache
import gzip
import hashlib
import json
from pathlib import Path
import random
import sqlite3
from urllib.parse import quote

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
    # Match the two display families on the Verso roadmap. The exact source
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


def export(db, complete):
    catalog = json.loads(NATIVE_FOLDERS.read_text())
    folders = {entry["path"] for entry in catalog["folders"]}
    folders.update(path.replace("/", ".") for path in catalog["quantumInfoFolders"])

    @cache
    def native_folder(topic):
        # Preserve the audit's scientific classification in SQLite, but publish
        # each result at its deepest actual directory in the pinned Lean tree.
        while topic and topic not in folders:
            topic = topic.rpartition(".")[0]
        return topic

    con = sqlite3.connect(f"file:{db.resolve()}?mode=ro", uri=True, timeout=60)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA temp_store=MEMORY")
    OUT.mkdir(parents=True, exist_ok=True)
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
        verified = con.execute("SELECT sum(verified_files) FROM source_receipts").fetchone()[0]
        if verified != sum(r["total"] for r in coverage):
            raise RuntimeError("Some source files are missing pinned Git-blob verification")
    modrows = con.execute("""
        SELECT m.module_id,m.repository,m.revision,m.path,mp.topic FROM roadmap_external_modules m
        JOIN module_placements mp ON m.module_id=mp.module_id ORDER BY m.module_id
    """).fetchall()
    groups = {}
    homes = {repo: native_folder(topic) for repo, topic in con.execute("SELECT repository, topic FROM project_homes")}
    if not repos <= homes.keys():
        raise RuntimeError("Each audited repository must have one primary roadmap home")
    whole_projects = defaultdict(list)
    batch_num = None
    batch = {}
    files_by_topic = defaultdict(set)
    unique_records = 0
    cols = """SELECT d.name,d.kind,d.line,d.status,dp.topic FROM roadmap_external_declarations d
              LEFT JOIN declaration_placements dp ON dp.declaration_id=d.decl_id
              WHERE d.module_id=? ORDER BY d.line,d.decl_id"""
    for m in modrows:
        repo = m["repository"]
        if repo not in repos:
            continue
        ident = m["module_id"]
        number = ident // 64
        if number != batch_num and batch:
            publish(OUT / f"d{batch_num}.json.gz", batch, compressed=True)
            batch = {}
        batch_num = number
        sections = defaultdict(list)
        for name, kind, line, status, topic in con.execute(cols, (ident,)):
            # An anonymous Lean example is retained in the audit database.
            # It has no named result for a reader to open in the roadmap.
            if kind == "example":
                continue
            sections[native_folder(topic or m["topic"])].append(dict(name=name, kind=kind, line=line, status=status))
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
        publish(OUT / f"d{batch_num}.json.gz", batch, compressed=True)
    topics = {}
    for (topic, repo), group in sorted(groups.items()):
        slug = hashlib.sha256((topic + "/" + repo).encode()).hexdigest()[:20]
        name = f"p{slug}.json"
        publish(OUT / name, {"files": sorted(group.files, key=lambda f: (f["project"], f["path"]))})
        index = topics.setdefault(topic, {"count": 0, "files": len(files_by_topic[topic]), "groups": []})
        count = sum(group.counts.values())
        index["count"] += count
        identity = {"inline": True, "label": ""} if not repo else {
            "primary": True, "label": repo.split("/")[-1], "project": repo}
        if repo:
            all_name = "r" + hashlib.sha256(repo.encode()).hexdigest()[:20] + ".json"
            all_files = sorted(whole_projects[repo], key=lambda f: f["path"])
            publish(OUT / all_name, {"files": all_files})
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
        primary_repos = {repo for _, repo in groups if repo}
        if primary_repos != set(whole_projects):
            raise RuntimeError(f"Missing repository homes: {sorted(set(whole_projects) - primary_repos)}")
    index_path = OUT / "index.json"
    prior_topics = json.loads(index_path.read_text())["topics"] if index_path.exists() else {}
    publish(index_path, index)
    # Old topic manifests are unreachable once the new index is public.
    # Only remove our own previously published group names.
    current = {g["href"] for entry in topics.values() for g in entry["groups"]}
    previous = {g["href"] for entry in prior_topics.values() for g in entry["groups"]}
    for obsolete in previous - current:
        slug = obsolete.removeprefix(PREFIX + "p").removesuffix(".json")
        if len(slug) == 20 and all(c in "0123456789abcdef" for c in slug):
            (OUT / f"p{slug}.json").unlink(missing_ok=True)
    print(f"{len(repos)} repositories, {index['fileCount']} audited files, {unique_records} plotted declarations, {len(topics)} topics")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--complete", action="store_true", help="require a full audit and placement before exporting")
    args = parser.parse_args()
    export(args.db, args.complete)
