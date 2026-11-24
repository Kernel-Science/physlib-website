"""Independently match every indexed source blob to its pinned public Git tree."""
import argparse
import concurrent.futures
import json
import os
from pathlib import Path
import shutil
import subprocess
import time
import urllib.request

from roadmap_audit import DEFAULT_DB, connect

def tree(repo, sha, recursive):
    endpoint = f"repos/{repo}/git/trees/{sha}" + ("?recursive=1" if recursive else "")
    for attempt in range(4):
        try:
            if not os.environ.get("GITHUB_TOKEN") and shutil.which("gh"):
                return json.loads(subprocess.check_output(["gh","api",endpoint], timeout=90))
            headers = {"User-Agent":"physlib-roadmap-source-audit"}
            if token := os.environ.get("GITHUB_TOKEN"):
                headers["Authorization"]="Bearer " + token
            req = urllib.request.Request("https://api.github.com/"+endpoint,headers=headers)
            with urllib.request.urlopen(req,timeout=90) as response:
                return json.load(response)
        except (subprocess.SubprocessError,OSError):
            if attempt==3:
                raise
            time.sleep(2**attempt)

def identities(repo, revision, wanted):
    result = {}
    def visit(sha,prefix,paths,recursive):
        obj=tree(repo,sha,recursive)
        if obj["truncated"]:
            if not recursive:
                raise ValueError(f"Unavailable git tree {repo}@{sha}")
            visit(sha,prefix,paths,False)
            return
        if recursive:
            for item in obj["tree"]:
                path=prefix+item["path"]
                if path in paths and item["mode"] in ("100644","100755"):
                    result[path]=item["sha"]
        else:
            groups={}
            for path in paths:
                groups.setdefault(path[len(prefix):].split("/",1)[0],set()).add(path)
            for item in obj["tree"]:
                group = groups.get(item["path"])
                if not group:
                    continue
                path=prefix+item["path"]
                if item["type"]=="tree":
                    # Narrow the very large OpenAI corpus to its actual scoped
                    # Lean branches before requesting a recursive tree.
                    full = repo.lower()!="openai/math" or path.count("/")>=3
                    visit(item["sha"],path+"/",group,full)
                elif item["mode"] in ("100644","100755") and path in paths:
                    result[path]=item["sha"]
    visit(revision,"",wanted,repo.lower()!="openai/math")
    if len(result)!=len(wanted):
        raise ValueError(f"{repo}: pin did not identify {list(wanted-result.keys())[:5]}")
    return result

def verify(db,workers=5):
    con=connect(db)
    con.execute("""CREATE TABLE IF NOT EXISTS source_receipts(
      project_id INTEGER PRIMARY KEY REFERENCES projects, verified_files INTEGER NOT NULL,
      method TEXT NOT NULL)""")
    projects=list(con.execute("""SELECT p.id,p.repository,p.revision FROM projects p
      WHERE NOT EXISTS(SELECT 1 FROM source_receipts s WHERE s.project_id=p.id)
      AND NOT EXISTS(SELECT 1 FROM files f WHERE f.project_id=p.id AND f.status!='audited') ORDER BY p.id"""))
    con.close()
    def worker(p):
        pid,repo,rev=p
        dbcon=connect(db)
        try:
            hashes=dict(dbcon.execute("SELECT path,blob_sha FROM files WHERE project_id=?",(pid,)))
            upstream=identities(repo,rev,set(hashes))
            if mismatch:=[k for k,v in hashes.items() if upstream[k]!=v]:
                raise ValueError(f"Source hash mismatch for {repo}: {mismatch[:5]}")
            with dbcon:
                dbcon.execute("INSERT OR REPLACE INTO source_receipts VALUES(?,?,?)",
                              (pid,len(upstream),"pinned-git-tree-and-source-blob-sha1"))
        finally:
            dbcon.close()
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        list(pool.map(worker,projects))

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db",type=Path,default=DEFAULT_DB)
    args=parser.parse_args()
    verify(args.db)
    con=connect(args.db)
    print(con.execute("SELECT count(*),sum(verified_files) FROM source_receipts").fetchone())
    con.close()
