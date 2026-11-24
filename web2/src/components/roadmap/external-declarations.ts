"use client";

import { useEffect, useMemo, useState } from "react";
import type { Declaration } from "./layout";

export type Counts = { def: number; thm: number; other: number };
export type ExternalRow = { name: string; kind: string; line: number; status: string; href?: string };
export type ExternalSample = ExternalRow & { path: string; project?: string };
export type ExternalGroup = {
  label?: string; project?: string; primary?: boolean; inline?: boolean; byProject?: Record<string,number>; allFilesHref?: string; totalCount?: number; count: number; href: string; counts: Counts; samples?: ExternalSample[];
};
export type ExternalIndex = { count: number; files: number; groups: ExternalGroup[] };
export type ExternalFile = { name: string; path: string; project: string; topic?: string; href: string; count: number; declsHref: string; counts: Counts };
export type ExternalChoice = { all?: boolean; topic?: string; project?: string; path?: string; line?: number; name?: string };

const statements = new Set(["lemma","theorem","axiom"]);
export function sourceDeclaration(row: ExternalRow, project: string, filePath: string, moduleHref?: string): Declaration {
  const kind = statements.has(row.kind) ? "thm" : "def";
  return {
    name: row.name, kind, source: "External", sourceKind: row.kind, line: row.line, status: row.status,
    href: row.href ?? (moduleHref ? `${moduleHref}#L${row.line}` : undefined), project, filePath,
  };
}

type Resource<T> = { data?: T; error?: boolean };
const cache = new Map<string, unknown>();

export function useShard<T>(href?: string): Resource<T> {
  const [state,setState] = useState<Resource<T> & { href: string }>();
  useEffect(() => {
    if (!href) return;
    const controller = new AbortController();
    const [url,key] = href.split("#");
    async function load() {
      let body = cache.get(url);
      if (!body) {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        if (url.endsWith(".gz") && !response.headers.get("Content-Encoding")?.includes("gzip")) {
          if (!response.body) throw new Error("Empty declaration shard");
          body = await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
        } else {
          body = await response.json();
        }
        if (controller.signal.aborted) return;
        cache.set(url, body);
        if (cache.size > 8) cache.delete(cache.keys().next().value!);
      }
      const data = (key ? (body as Record<string, unknown>)[decodeURIComponent(key)] : body) as T;
      if (!data) throw new Error("Missing file in declaration index");
      setState({ href: href!, data });
    }
    load().catch(() => { if (!controller.signal.aborted) setState({ href: href!, error: true }); });
    return () => controller.abort();
  },[href]);
  return state?.href === href && state ? state : {};
}

export function useExternalChoice(group?: ExternalGroup, choice?: ExternalChoice) {
  const groupData = useShard<{files: ExternalFile[]}>(choice?.all && group?.allFilesHref ? group.allFilesHref : group?.href);
  const file = useMemo(() => groupData.data?.files.find(item => item.path === choice?.path && (!choice?.project || item.project === choice.project) && (!choice?.topic || item.topic === choice.topic)), [groupData.data, choice?.path,choice?.project,choice?.topic]);
  const fileData = useShard<{declarations: ExternalRow[]}>(file?.declsHref);
  const rows = useMemo(() => file && fileData.data ? fileData.data.declarations.map(row =>
    sourceDeclaration(row, file.project, file.path, file.href)) : undefined, [file, fileData.data]);
  const decl = rows?.find(row => row.line === choice?.line && (!choice?.name || row.name === choice.name));
  return { files: groupData.data?.files, file, rows, decl, error: groupData.error || fileData.error };
}

export type ExternalView = ReturnType<typeof useExternalChoice>;
