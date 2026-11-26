"use client";

import { useEffect, useMemo, useState } from "react";
import { articleHref, type SidebarManifest } from "./roadmap-sidebar-data";

const pageSize = 12;

function searchWords(text: string) {
  return text.normalize("NFKC")
    .replace(/([\p{Ll}\d])([\p{Lu}])/gu, "$1 $2")
    .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function WikiSearch() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(pageSize);
  const [manifest, setManifest] = useState<SidebarManifest>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const words = searchWords(query).split(/\s+/).filter(Boolean);
  const searching = words.length > 0;

  useEffect(() => {
    if (!searching || manifest) return;
    const controller = new AbortController();
    setFailed(false);
    fetch("/api/roadmap-sidebar", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("API Map index unavailable");
        return response.json() as Promise<SidebarManifest>;
      })
      .then(setManifest)
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [searching, manifest, retry]);

  const index = useMemo(() => (manifest?.articles ?? []).map(article => ({
    article, text: searchWords([article.title, article.target].join(" ")),
  })), [manifest]);
  const matches = searching ? index.filter(entry => words.every(word => entry.text.includes(word))) : [];

  return (
    <div className="mt-6">
      <label htmlFor="wiki-search" className="mb-2 block text-sm font-medium">Search API Maps</label>
      <input id="wiki-search" type="search" className="site-field w-full" autoComplete="off"
        placeholder="Topic or article title" value={query}
        onChange={event => { setQuery(event.target.value); setLimit(pageSize); }} />
      {searching && (
        <div className="mt-3">
          <p className="text-xs text-muted" role="status">
            {manifest ? (matches.length ? `${matches.length} ${matches.length === 1 ? "result" : "results"}` : "No matching articles.")
              : failed ? "The API Map index could not be loaded." : "Searching…"}
          </p>
          {failed && !manifest && <button type="button" className="text-sm text-accent underline" onClick={() => setRetry(previous => previous + 1)}>Try again</button>}
          {matches.length > 0 && (
            <ul className="mt-2 divide-y divide-border border-y border-border">
              {matches.slice(0, limit).map(({ article }) => (
                <li key={article.kind + article.target}>
                  <a href={articleHref(article)} className="block rounded-(--radius) px-1 py-2 hover:bg-surface-secondary">
                    <span className="block text-sm font-medium text-accent">{article.title}</span>
                    <span className="block break-all text-xs text-muted">{article.folder}/</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {matches.length > limit && <button type="button" className="mt-2 text-sm text-accent hover:underline" onClick={() => setLimit(limit + pageSize)}>Show more results</button>}
        </div>
      )}
    </div>
  );
}
