import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { searchPhyslib, type SearchKind } from "@/lib/physlib-site-search";

export const metadata: Metadata = {
  title: "Search | Physlib",
  description: "Find Lean declarations, modules, TODOs, API maps, references, and pages in Physlib.",
};

const kinds: Record<SearchKind, [string, string]> = {
  declaration: ["Declaration", "Declarations"],
  module: ["Module", "Modules"],
  page: ["Page", "Pages"],
  todo: ["TODO", "TODOs"],
  "api-map": ["API map", "API maps"],
  reference: ["Reference", "References"],
};

type Scope = "all" | SearchKind;
type Params = { q?: string | string[]; scope?: string | string[] };

function resultsUrl(query: string, scope: Scope) {
  const params = new URLSearchParams({ q: query });
  if (scope !== "all") params.set("scope", scope);
  return `/search?${params}`;
}

async function Results({ query, scope }: { query: string; scope: Scope }) {
  let data: Awaited<ReturnType<typeof searchPhyslib>>;
  try {
    data = await searchPhyslib(query, scope);
  } catch {
    return (
      <p role="alert" className="mt-8 text-sm">
        Search is temporarily unavailable.{" "}
        <a href={resultsUrl(query, scope)} className="text-accent underline underline-offset-4">Try again</a>
      </p>
    );
  }

  const { results, counts, total } = data;
  const allCount = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const filters: { scope: Scope; label: string; count: number }[] = [
    { scope: "all", label: "All", count: allCount },
    ...Object.entries(kinds).map(([kind, labels]) => ({
      scope: kind as SearchKind, label: labels[1], count: counts[kind as SearchKind],
    })),
  ];

  return (
    <section aria-label="Search results" className="mt-8">
      {(allCount > 0 || scope !== "all") && (
        <nav aria-label="Filter search results" className="mb-7 flex flex-wrap gap-2">
          {filters.filter((filter) => filter.count > 0 || filter.scope === scope || filter.scope === "all").map((filter) => (
            <Link
              key={filter.scope}
              href={resultsUrl(query, filter.scope)}
              prefetch={false}
              scroll={false}
              aria-current={filter.scope === scope ? "page" : undefined}
              className={`rounded-(--radius) border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                filter.scope === scope
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:bg-surface-secondary hover:text-foreground"
              }`}
            >
              {filter.label} <span className="tabular-nums">{filter.count.toLocaleString("en")}</span>
            </Link>
          ))}
        </nav>
      )}
      {total === 0 ? (
        <p role="status" className="text-sm leading-relaxed text-muted">
          No {scope === "all" ? "results" : kinds[scope][1].toLowerCase()} found for “{query}”.
          {" "}Try a shorter term or a Lean name.
        </p>
      ) : (
        <>
          <p role="status" className="mb-2 text-sm text-muted">
            {results.length < total ? `Showing ${results.length} of ` : ""}
            {total.toLocaleString("en")} {total === 1 ? "result" : "results"} for “{query}”
          </p>
          <ul className="divide-y divide-border border-y border-border">
            {results.map((result) => (
              <li key={`${result.kind}-${result.href}-${result.title}`} className="py-4">
                <p className="mb-1 text-xs text-muted">{kinds[result.kind][0]}</p>
                <a href={result.href} className={`break-words font-medium text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent ${
                  result.kind === "declaration" || result.kind === "module" ? "font-mono text-sm" : "text-base"
                }`}>
                  {result.title}
                </a>
                {result.description && (
                  <p className="mt-1 break-words text-sm leading-relaxed text-muted">{result.description}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const query = (Array.isArray(params.q) ? params.q[0] : params.q)?.trim().slice(0, 200) ?? "";
  const value = Array.isArray(params.scope) ? params.scope[0] : params.scope;
  const scope: Scope = value && Object.hasOwn(kinds, value) ? value as SearchKind : "all";

  return (
    <div className="page-frame-tracker">
      <h1 className="page-title-tracker">Search Physlib</h1>
      <p className="page-intro-tracker mb-6">Find Lean declarations, modules, pages, TODOs, API maps, and references.</p>
      <Form key={query} action="/search" role="search" className="flex gap-2">
        <label htmlFor="physlib-query" className="sr-only">Search Physlib</label>
        <input
          id="physlib-query"
          name="q"
          type="search"
          maxLength={200}
          defaultValue={query}
          placeholder="Search by keyword or Lean name"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-accent"
        />
        {scope !== "all" && <input type="hidden" name="scope" value={scope} />}
        <button type="submit" className="rounded-(--radius) bg-accent px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
          Search
        </button>
      </Form>
      <p className="mt-3 text-sm text-muted">
        <a href="https://physlibsearch.net" className="text-accent hover:underline">
          Semantic search on PhyslibSearch <span aria-hidden="true">↗</span>
        </a>
      </p>
      {query && (
        <Suspense key={resultsUrl(query, scope)} fallback={<p role="status" className="mt-8 text-sm text-muted">Searching…</p>}>
          <Results query={query} scope={scope} />
        </Suspense>
      )}
    </div>
  );
}
