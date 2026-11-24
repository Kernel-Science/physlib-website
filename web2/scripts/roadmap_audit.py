"""Index source declarations from the published, commit-pinned Lean file manifests.

Run python3 scripts/roadmap_audit.py. No toolchain, elaboration, or proof check is
performed. Downloads stream in memory, and completed files survive an interrupted run.
"""
import argparse
import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import tarfile
import time
import urllib.parse
import urllib.request

WEB = Path(__file__).resolve().parents[1]
DEFAULT_DB = WEB / "data/roadmap-audit/declarations.sqlite"

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
 id INTEGER PRIMARY KEY, repository TEXT NOT NULL, revision TEXT NOT NULL,
 UNIQUE(repository,revision)
);
CREATE TABLE IF NOT EXISTS files (
 id INTEGER PRIMARY KEY, project_id INTEGER NOT NULL REFERENCES projects,
 path TEXT NOT NULL, subject TEXT NOT NULL, blob_sha TEXT, status TEXT NOT NULL DEFAULT 'pending',
 byte_count INTEGER, line_count INTEGER, has_sorry INTEGER, has_admit INTEGER, parser_version INTEGER NOT NULL DEFAULT 1,
 UNIQUE(project_id,path)
);
CREATE TABLE IF NOT EXISTS declarations (
 id INTEGER PRIMARY KEY, file_id INTEGER NOT NULL REFERENCES files,
 line INTEGER NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL,
 has_sorry INTEGER NOT NULL, has_admit INTEGER NOT NULL
);
DROP INDEX IF EXISTS declaration_file;
CREATE UNIQUE INDEX IF NOT EXISTS declaration_source_line ON declarations(file_id,line);
CREATE TABLE IF NOT EXISTS audit_metadata(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE VIEW IF NOT EXISTS roadmap_external_modules AS
 SELECT f.id module_id,p.repository,p.revision,f.path,f.subject,f.blob_sha,f.status,
        f.byte_count,f.line_count,f.has_sorry,f.has_admit
 FROM files f JOIN projects p ON p.id=f.project_id;
CREATE VIEW IF NOT EXISTS roadmap_external_declarations AS
 SELECT d.id decl_id,f.id module_id,p.repository,p.revision,f.path,d.line,d.name,d.kind,
 CASE WHEN d.kind IN ('axiom','constant') THEN 'axiom' WHEN d.has_sorry THEN 'sorry'
 WHEN d.has_admit THEN 'admit' ELSE 'source' END status,d.has_sorry,d.has_admit
 FROM declarations d JOIN files f ON f.id=d.file_id JOIN projects p ON p.id=f.project_id;
"""

def connect(db):
    db.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(db, timeout=120)
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA temp_store=MEMORY")
    con.execute("PRAGMA wal_autocheckpoint=512")
    return con

def initialize(con):
    con.executescript(SCHEMA)
    con.executemany("INSERT OR REPLACE INTO audit_metadata(key,value) VALUES(?,?)", [
        ("coverage", "Files from the Physlib roadmap external project manifests at the listed Git revisions"),
        ("source", "Syntactic Lean commands and source lines; no toolchain build or verification of proofs"),
        ("names", "Source namespace qualification; anonymous examples and instances identified by file and line"),
        ("admissions", "Literal sorry/admit tokens in code outside comments, strings, syntax quotations, and document prose"),
        ("blobs", "Git blob SHA-1 plus independent pinned Git tree comparison in source_receipts"),
    ])
    if "parser_version" not in {r[1] for r in con.execute("PRAGMA table_info(files)")}:
        con.execute("ALTER TABLE files ADD COLUMN parser_version INTEGER NOT NULL DEFAULT 1")
    data = json.loads((WEB / "public/roadmap-view/roadmap-data.json").read_text())
    projects = data.get("projects")
    if projects is None:
        projects = []
        todo = [data["tree"]]
        while todo:
            node = todo.pop()
            todo.extend(node.get("children", []))
            if node.get("externalProject"):
                projects.append({**node["externalProject"], "subject": node["path"].split(".")[0]})
    with con:
        for meta in projects:
            manifest = json.loads((WEB / "public" / meta["modulesHref"].lstrip("/")).read_text())
            key = (manifest["repository"], manifest["revision"])
            con.execute("INSERT OR IGNORE INTO projects(repository,revision) VALUES(?,?)", key)
            project = con.execute("SELECT id FROM projects WHERE repository=? AND revision=?", key).fetchone()[0]
            con.executemany("INSERT OR IGNORE INTO files(project_id,path,subject) VALUES(?,?,?)",
                            ((project, path, meta["subject"]) for path in manifest["files"]))
    count = con.execute("SELECT count(*) FROM files").fetchone()[0]
    if count != data["stats"]["externalCatalogue"]["files"]:
        raise RuntimeError("Inventory changed; use a new SQLite output for the new snapshot")

# Mask non-code before recognizing commands, preserving every original line.
# Keep escaped Lean identifiers («…»), including unicode and punctuation.
SPECIAL = re.compile(r'/-|--[^\n]*|r(#+)?"|"(?:\\[\s\S]|[^"\\])*"|«[^»\n]*»|@\[|[^\w]\'(?:\\.|[^\\\'\n])\'')
NESTED = re.compile(r'/-|-/')
NAME = r"(?:«[^»\n]+»|[^\W\d][\w'!?₀-₉]*)"
QUALIFIED = re.compile(NAME + r"(?:\." + NAME + r")*")
MODS = r"(?:(?:private|public|protected|noncomputable|partial|unsafe|local|scoped|nonrec|meta)\s+)*"
KIND = r"class[ \t]+inductive|theorem|lemma|def|abbrev|instance|structure|class|inductive|coinductive|opaque|axiom|constant|example|informal_definition|informal_lemma|semiformal_result"
COMMAND = re.compile(r"^([ \t]*)(?:" + MODS + r")(?P<kind>" + KIND + r"|namespace|section|mutual|end)\b[ \t]*(?P<tail>.*)$")
MARK = re.compile(r"(?<![\w.'])\b(sorry|admit)\b(?![\w'])")
ANON = re.compile(r"^(?:\([^()\n]*\)\s*)+")

def blank(text):
    return re.sub(r'[^\n]+', lambda m: ' ' * len(m[0]), text)

def strip_noncode(text):
    out, pos, start = [], 0, 0
    while (m := SPECIAL.search(text, pos)):
        token = m[0]
        end = m.end()
        if token.startswith("«"):
            pos = end
            continue
        if token == "/-":
            depth = 1
            for boundary in NESTED.finditer(text, end):
                depth += 1 if boundary[0] == "/-" else -1
                if not depth:
                    end = boundary.end()
                    break
            else:
                end = len(text)
        elif token.startswith("r") and token.endswith('"'):
            # Prefix r"…" / r#"…"# is only special at a token boundary.
            if m.start() and (text[m.start()-1].isalnum() or text[m.start()-1] == "_"):
                pos = m.start()+1
                continue
            closing = '"' + (m[1] or "")
            idx = text.find(closing, end)
            end = len(text) if idx < 0 else idx + len(closing)
        elif token == "@[":
            # Keep other syntax masking correct when attribute names contain strings.
            pos = end
            continue
        out.append(text[start:m.start()])
        out.append(blank(text[m.start():end]))
        pos = start = end
    out.append(text[start:])
    text = ''.join(out)
    # Attributes can be inline, e.g. @[simp] public theorem … . Balanced
    # brackets also handle forms such as @[simp (config := {…})].
    idx, start, out = 0, 0, []
    while (idx := text.find("@[", idx)) != -1:
        depth = 1
        end = idx+2
        for bracket in re.finditer(r"[\[\]]",text[end:]):
            depth += 1 if bracket[0] == "[" else -1
            if not depth:
                end += bracket.end()
                break
        else:
            break
        out.extend((text[start:idx], blank(text[idx:end])))
        idx = start = end
    out.append(text[start:])
    return ''.join(out)

DOC = re.compile(r"(?m)^[ \t]*#doc\b")
QUOTE = re.compile(r"\x60\(")
COMMAND_BOUNDARY = re.compile(r"^[ \t]*(?:#|(?:end|namespace|section|open|set_option|variable|universe|import|export|attribute|macro_rules|syntax|notation)\b)")

def structural_source(cleaned):
    # A Verso #doc body is a document, including prose and example code.
    doc = DOC.search(cleaned)
    if doc:
        cleaned = cleaned[:doc.start()]
    # Command quotations in macro implementations contain syntax data.
    out, start = [], 0
    while q := QUOTE.search(cleaned, start):
        depth, end = 1, q.end()
        for paren in re.finditer(r"[()]", cleaned[end:]):
            depth += 1 if paren[0] == "(" else -1
            if depth == 0:
                end += paren.end()
                break
        else:
            break
        out.extend((cleaned[start:q.start()], blank(cleaned[q.start():end])))
        start = end
    return "".join(out) + cleaned[start:]

def declarations(text):
    cleaned = structural_source(strip_noncode(text))
    lines = cleaned.splitlines()
    scopes, records = [], []
    for i, line in enumerate(lines):
        cmd = COMMAND.match(line)
        if not cmd:
            continue
        kind, tail = cmd["kind"], cmd["tail"]
        name = QUALIFIED.match(tail)
        name = name[0] if name else ""
        if kind in {"namespace","section","mutual"}:
            scopes.append((kind,name))
            continue
        if kind == "end":
            if name:
                hit = next((j for j in range(len(scopes)-1,-1,-1) if scopes[j][1] == name), None)
                if hit is not None:
                    del scopes[hit:]
            elif scopes:
                scopes.pop()
            continue
        kind = re.sub(r"\s+", " ", kind)
        if kind == "instance":
            # Lean allows a priority annotation between instance and the name.
            if tail.startswith("(priority"):
                n = QUALIFIED.match(ANON.sub("",tail))
                name = n[0] if n else ""
        if not name and kind not in {"example","instance"} and not tail.strip():
            for seq in lines[i+1:i+4]:
                if seq.strip():
                    n = QUALIFIED.match(seq.strip())
                    if n:
                        name = n[0]
                    break
        if kind == "example" or (kind == "instance" and name in {"where","with"}):
            name = ""
        if not name and kind not in {"example","instance"}:
            continue
        if not name:
            name = f"«anonymous {kind}»"
        name = (name[7:] if name.startswith("_root_.") else
                ".".join([*(v for k,v in scopes if k == "namespace" and v),name]))
        records.append((i,kind,name))
    # Place proof markers only in the recognized declaration span, and never
    # in comments, strings or a subsequent example/declaration.
    out = []
    file_markers = {m[1] for m in MARK.finditer(cleaned)}
    for ix,(i,kind,name) in enumerate(records):
        stop = records[ix+1][0] if ix+1 < len(records) else len(lines)
        flags = set()
        if file_markers:
            indent = len(lines[i]) - len(lines[i].lstrip())
            for j in range(i, stop):
                line = lines[j]
                if j != i and len(line)-len(line.lstrip()) <= indent and COMMAND_BOUNDARY.match(line):
                    break
                flags.update(m[1] for m in MARK.finditer(line))
        out.append((i+1,name,kind,int("sorry" in flags),int("admit" in flags)))
    return out, file_markers

def git_blob(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()

def fetch(url, timeout=90):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "physlib-roadmap-source-audit"}), timeout=timeout)

def parse_file(item, raw, expected=None):
    digest = git_blob(raw)
    if expected and digest != expected:
        raise RuntimeError(f"Git object hash mismatch for {item}")
    text = raw.decode("utf-8-sig")  # invalid source must be investigated explicitly
    fid, version, admissions = item
    if version == 1 and "#doc" not in text and "\x60(" not in text and not admissions:
        return fid, digest, len(raw), len(text.splitlines()), set(), None
    decls, flags = declarations(text)
    return fid, digest, len(raw), len(text.splitlines()), flags, decls

def archive_files(repo, rev, paths):
    # GitHub codeload streams git-archive format. Verify the commit in the
    # tar's PAX header; hash each selected blob including Git's object header.
    url = f"https://codeload.github.com/{repo}/tar.gz/{rev}"
    with fetch(url) as response, tarfile.open(fileobj=response, mode="r|gz", bufsize=1<<20) as archive:
        for member in archive:
            if archive.pax_headers.get("comment") != rev:
                raise RuntimeError(f"Unverified archive revision for {repo}")
            path = member.name.partition("/")[2]
            if path in paths and member.isfile():
                yield parse_file(paths[path], archive.extractfile(member).read())

def local_git_files(checkout, rev, paths):
    for path, fid in paths.items():
        spec = f"{rev}:{path}"
        sha = subprocess.check_output(["git","-C",checkout,"rev-parse",spec]).decode().strip()
        raw = subprocess.check_output(["git","-C",checkout,"cat-file","blob",sha])
        yield parse_file(fid,raw,sha)

def raw_files(repo, rev, paths):
    # openai/math includes many thousands of unrelated preprints; request only
    # the scoped Lean blobs instead of transferring that entire archive.
    def read_one(pair):
        path, fid = pair
        url = f"https://raw.githubusercontent.com/{repo}/{rev}/{urllib.parse.quote(path)}"
        for attempt in range(4):
            try:
                with fetch(url) as response:
                    data = response.read()
                return parse_file(fid, data)
            except (OSError,TimeoutError):
                if attempt == 3:
                    raise
                time.sleep(2**attempt)
    # Batches bound both live sockets and retained decoded objects.
    items = iter(paths.items())
    from itertools import islice
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        while batch := list(islice(items,100)):
            yield from pool.map(read_one,batch)

def ingest(db, project, repo, rev, local):
    con = connect(db)
    try:
        for retry in range(3):
            pending = {path:(fid,version,admissions) for path,fid,version,admissions in con.execute(
                "SELECT path,id,CASE WHEN status='audited' THEN parser_version ELSE 0 END,has_sorry OR has_admit "
                "FROM files WHERE project_id=? AND (status!='audited' OR parser_version<2)",(project,))}
            if not pending:
                break
            if shutil.disk_usage(db.parent).free < 128 * 1024**2:
                raise RuntimeError("Not enough working disk space to continue the audit")
            try:
                if local:
                    rows = local_git_files(local,rev,pending)
                elif repo.lower() == "openai/math":
                    rows = raw_files(repo,rev,pending)
                else:
                    rows = archive_files(repo,rev,pending)
                for n,(fid,sha,size,lines,flags,decls) in enumerate(rows,1):
                    if decls is None:
                        con.execute("UPDATE files SET parser_version=2 WHERE id=? AND blob_sha=?", (fid,sha))
                        if n%30 == 0:
                            con.commit()
                        continue
                    con.execute("UPDATE files SET status='audited',parser_version=2,blob_sha=?,byte_count=?,line_count=?,has_sorry=?,has_admit=? WHERE id=?",
                                (sha,size,lines,int("sorry" in flags),int("admit" in flags),fid))
                    previous = {(l,n,k):i for i,l,n,k in con.execute(
                        "SELECT id,line,name,kind FROM declarations WHERE file_id=?", (fid,))}
                    inserts = []
                    for line,name,kind,sorry,admit in decls:
                        previous_id = previous.pop((line,name,kind),None)
                        if previous_id is None:
                            inserts.append((fid,line,name,kind,sorry,admit))
                        else:
                            con.execute("UPDATE declarations SET has_sorry=?,has_admit=? WHERE id=?", (sorry,admit,previous_id))
                    con.executemany("DELETE FROM declarations WHERE id=?", ((i,) for i in previous.values()))
                    con.executemany("INSERT INTO declarations(file_id,line,name,kind,has_sorry,has_admit) VALUES(?,?,?,?,?,?)", inserts)
                    if n%30 == 0:
                        con.commit()
                con.commit()
            except (OSError,tarfile.TarError,TimeoutError) as err:
                con.commit()
                print("Retry",repo,type(err).__name__,flush=True)
                if retry == 2:
                    raise
                time.sleep(2**retry)
        left = con.execute("SELECT COUNT(*) FROM files WHERE project_id=? AND (status!='audited' OR parser_version<2)",(project,)).fetchone()[0]
        if left:
            raise RuntimeError(f"{repo}@{rev} has {left} unverified files")
        print("Completed",repo,rev[:8],flush=True)
    finally:
        con.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",type=Path,default=DEFAULT_DB)
    parser.add_argument("--workers",type=int,default=4)
    parser.add_argument("--repo")
    parser.add_argument("--checkout",type=Path,action="append",default=[],
                        help="An optional local git clone. Its committed blobs are read at the indexed revision.")
    args = parser.parse_args()
    con = connect(args.db)
    initialize(con)
    projects = list(con.execute("""
        SELECT p.id,p.repository,p.revision,COUNT(*) FROM projects p JOIN files f ON f.project_id=p.id
        WHERE (f.status!='audited' OR f.parser_version<2) GROUP BY p.id ORDER BY (lower(p.repository)='yezhuoyang/logicq') DESC, COUNT(*) DESC
    """))
    con.close()
    if args.repo:
        projects = [p for p in projects if args.repo.lower() == p[1].lower()]
    def run(p):
        pid,repo,rev,_=p
        checkout=next((str(c) for c in args.checkout if subprocess.run(
            ["git","-C",c,"cat-file","-e",rev+"^{commit}"],capture_output=True).returncode==0),None)
        ingest(args.db,pid,repo,rev,checkout)
    errors=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(run,p):p for p in projects}
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception as err:
                p=futures[future]
                errors.append((p[1],str(err)))
                print("Failed",p[1],str(err),flush=True)
    if errors:
        raise SystemExit(f"Incomplete sources: {errors}")
    if not args.repo:
        from roadmap_verify_blobs import verify
        verify(args.db,args.workers)

if __name__ == "__main__":
    main()
