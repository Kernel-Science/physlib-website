"use client";

import { useEffect, useMemo, useState } from "react";
import { GitHubProfilePill } from "@/components/github-profile-pill";
import type { Entry } from "./layout";
import styles from "./roadmap-contributors.module.css";

type Person = { login: string; loc?: number };
type NativeIndex = {
  names: string[];
  logins: (string | null)[];
  paths: Record<string, number[]>;
  loc?: Record<string, number[]>;
};
let nativeRequest: Promise<NativeIndex> | undefined;

function nativeIndex() {
  nativeRequest ??= fetch("/roadmap-view/native-contributors.json").then(async response => {
    if (!response.ok) throw new Error("Could not load Git authors");
    return await response.json() as NativeIndex;
  }).catch(error => {
    nativeRequest = undefined;
    throw error;
  });
  return nativeRequest;
}

function scopedPaths(entry: Entry, index: NativeIndex, library?: "Physlib" | "PhyslibAlpha"): string[] {
  const { node } = entry;
  if (entry.kind === "todos") {
    const folder = node.apiMapHref?.split("#")[1];
    return folder && Object.hasOwn(index.paths, folder) ? [folder] : [];
  }
  const path = node.path.replaceAll(".", "/");
  if (entry.kind === "folder") {
    const candidates = path === "QuantumInfo" || path.startsWith("QuantumInfo/")
      ? [path] : ["Physlib/" + path, "PhyslibAlpha/" + path];
    return candidates.filter(key => Object.hasOwn(index.paths, key));
  }
  const keys = new Set<string>();
  for (const link of node.moduleLinks ?? []) {
    if (library && link.source !== library) continue;
    // Native module links identify the actual library, including QuantumInfo.
    const pinned = /^https:\/\/github\.com\/leanprover-community\/physlib\/blob\/[0-9a-f]{40}\/(.+\.lean)$/.exec(link.href);
    if (pinned && Object.hasOwn(index.paths, pinned[1])) keys.add(pinned[1]);
  }
  if (!node.moduleLinks?.length) {
    for (const source of entry.sources) {
      if (library && source !== library) continue;
      if (source !== "Physlib" && source !== "PhyslibAlpha") continue;
      const module = path === source || path.startsWith("QuantumInfo/") ? path : source + "/" + path;
      const file = module + ".lean";
      if (Object.hasOwn(index.paths, file)) keys.add(file);
    }
  }
  return [...keys];
}

function filePeople(keys: string[], index: NativeIndex): Person[] {
  const authors = new Map<string, Person>();
  const paths = [...new Set(keys)];
  const hasLines = paths.every(path => index.loc?.[path]?.length === index.paths[path].length);
  for (const path of paths) {
    const seen = new Set<number>();
    index.paths[path].forEach((id, i) => {
      if (seen.has(id)) return;
      seen.add(id);
      const login = index.logins[id];
      if (!login) return;
      const key = login.toLowerCase();
      const author = authors.get(key) ?? { login };
      if (hasLines) author.loc = (author.loc ?? 0) + index.loc![path][i];
      authors.set(key, author);
    });
  }
  return [...authors.values()].sort((a, b) =>
    (b.loc ?? 0) - (a.loc ?? 0) || a.login.localeCompare(b.login, "en"));
}

function PeopleList({ people, scope }: { people?: Person[]; scope?: string }) {
  if (!people) return <div className={styles.status}>Contributors unavailable</div>;
  return <div className={styles.group}>
    <dl className={styles.heading}><dt>Contributors</dt><dd>{people.length.toLocaleString("en-US")}</dd></dl>
    {scope && <div className={styles.scope}>{scope}</div>}
    <ul aria-label="Contributors" role="list">{people.map(({ login, loc }) => {
      const href = "https://github.com/" + encodeURIComponent(login);
      const lines = loc !== undefined ? `${loc.toLocaleString("en-US")} attributed ${loc === 1 ? "line" : "lines"} of code` : undefined;
      return <li key={login.toLowerCase()} title={lines}>
        <GitHubProfilePill label={login} avatarUrl={href + ".png?size=40"} href={href} lazyAvatar>
          {lines && <span className="sr-only">, {lines}</span>}
        </GitHubProfilePill>
      </li>;
    })}</ul>
  </div>;
}

export function RoadmapContributors({ entry, source }: {
  entry?: Entry;
  source?: "Physlib" | "PhyslibAlpha";
}) {
  const native = !!entry;
  const [index, setIndex] = useState<NativeIndex>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!native || index) return;
    let active = true;
    setFailed(false);
    nativeIndex().then(data => { if (active) setIndex(data); }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [entry, native, index, retry]);
  const nativePeople = useMemo(() => {
    if (!index || !entry || !native) return;
    const keys = scopedPaths(entry, index, source);
    return keys.length ? filePeople(keys, index) : undefined;
  }, [entry, native, index, source]);
  if (!entry) return null;
  return <div key={entry.kind + ":" + entry.node.path}>
    {native && (nativePeople ? <PeopleList people={nativePeople}
      scope={entry.kind === "todos" ? "Lean files in the article’s folder" : undefined}/>
      : index || failed ? <div className={styles.status}>Contributors unavailable
        {failed && <button type="button" onClick={() => setRetry(n => n + 1)}>Retry</button>}
      </div> : <div className={styles.status} role="status">Loading contributors…</div>)}
  </div>;
}
