"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiDetailView } from "./api-detail-view";
import { ApiFlowchart } from "./api-flowchart";
import { isWikiReaderPath, parseWikiFile, scrollToApiMapArticle, selectApiMapEntry } from "@/lib/api-map-hash";
import type { ApiMap } from "@/lib/yaml";

function readFragment() {
  try { return decodeURIComponent(window.location.hash.slice(1)); }
  catch { return ""; }
}

export function ApiMapReader({ articlePaths, referencePaths, home, children }: {
  home: "wiki" | "roadmap";
  children: ReactNode;
  articlePaths: string[];
  referencePaths: Record<string, string>;
}) {
  const [fragment, setFragment] = useState("");
  const shouldScroll = useRef(false);
  const apiPaths = useMemo(() => new Set(articlePaths), [articlePaths]);
  const [apiMap, setApiMap] = useState<ApiMap>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const isApi = apiPaths.has(fragment) || fragment === "dependency-map";
  const fileBookmark = parseWikiFile(fragment);

  useEffect(() => {
    if (!isApi || apiMap) return;
    const controller = new AbortController();
    setLoadFailed(false);
    fetch("/api/api-map?view=articles", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("API Map unavailable");
        return response.json() as Promise<ApiMap>;
      })
      .then(setApiMap)
      .catch(() => { if (!controller.signal.aborted) setLoadFailed(true); });
    return () => controller.abort();
  }, [isApi, apiMap, retry]);

  useEffect(() => {
    function update(event?: Event) {
      const next = readFragment();
      if (home === "wiki" && /^(?:d|f|dir|project)=/.test(next)) {
        window.location.replace("/roadmap" + window.location.search + window.location.hash);
        return;
      }
      // Old module bookmarks now open the published file in its native reader.
      const file = parseWikiFile(next);
      if (file) {
        const docs = Object.hasOwn(referencePaths, file.path) ? referencePaths[file.path] : undefined;
        if (docs) {
          const url = new URL(docs, window.location.origin);
          if (file.anchor) url.hash = file.anchor.replaceAll("___", ".");
          window.location.replace(url.href);
          return;
        }
      }
      shouldScroll.current = !(event instanceof CustomEvent && event.detail?.scrollToArticle === false);
      setFragment(next);
    }
    function followLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const href = anchor?.getAttribute("href");
      if (!href || !anchor || anchor.hasAttribute("download") || anchor.getAttribute("target") === "_blank") return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || !isWikiReaderPath(url.pathname) || !url.hash) return;
      let path: string;
      try { path = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      if (!apiPaths.has(path)) return;
      event.preventDefault();
      selectApiMapEntry(url.hash.slice(1), { scrollToArticle: true });
    }
    update();
    window.addEventListener("hashchange", update);
    document.addEventListener("click", followLink);
    return () => {
      window.removeEventListener("hashchange", update);
      document.removeEventListener("click", followLink);
    };
  }, [apiPaths, home, referencePaths]);

  useLayoutEffect(() => {
    if (!isApi || !shouldScroll.current) return;
    if (fragment === "dependency-map") {
      document.getElementById("dependency-map")?.scrollIntoView({ block: "start" });
    } else {
      scrollToApiMapArticle();
    }
  }, [fragment, isApi, apiMap]);

  return (
    <>
      <div hidden={isApi || Boolean(fileBookmark)}>{children}</div>
      {fileBookmark && <p role="status" className="mx-auto max-w-3xl py-8">
        The current Documentation index has no page for <code className="break-all">{fileBookmark.path.replaceAll("/", ".")}</code>.{" "}
        <a className="text-accent hover:underline" href="/docs/index.html">Browse Documentation →</a>
      </p>}
      {isApi && (
        <section id="api-map-reader" aria-label="Selected article" className="mx-auto min-w-0 max-w-5xl">
          {home === "roadmap" && <a href="/roadmap" className="mb-3 inline-block text-sm text-accent hover:underline"
            onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              const destination = event.currentTarget.pathname;
              if (window.location.pathname !== destination) {
                window.location.assign(destination + window.location.search);
                return;
              }
              selectApiMapEntry("");
              window.dispatchEvent(new Event("physlib:reset-roadmap"));
              requestAnimationFrame(() => {
                document.getElementById(home)?.focus({ preventScroll: true });
                window.scrollTo({ top: 0, behavior: "instant" });
              });
            }}>
            ← Reset Atlas
          </a>}
          {apiMap ? (
            <>
              <ApiDetailView apiMap={apiMap} activePath={fragment} referencePaths={referencePaths} />
              <section id="dependency-map" className="mt-14 scroll-mt-20">
                <h3 className="mb-1 text-sm font-semibold tracking-tight">Dependency map</h3>
                <p className="mb-4 text-sm leading-relaxed text-muted">See which articles this one cites, which articles cite it, and how the topics connect.</p>
                <ApiFlowchart nodes={apiMap.nodes} />
              </section>
            </>
          ) : loadFailed ? (
            <p role="alert">This API Map could not be loaded. <button type="button" className="text-accent underline" onClick={() => setRetry(count => count + 1)}>Try again</button></p>
          ) : <p role="status">Loading API Map…</p>}
        </section>
      )}
    </>
  );
}
