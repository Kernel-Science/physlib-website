"use client";

import { useState, useCallback } from "react";
import { labelTone, tagClass } from "@/lib/label-tone";
import { ListPager } from "@/components/list-pager";
import type { PullRequest } from "./tracker-data";

// "no-reviewer" ("Needs Reviewer") = ready for review and nobody has been
// asked to review it yet (matches the Worker's unreviewedPRs exactly when the
// report is available). "review" ("Needs Action") = a reviewer is assigned,
// the PR is not awaiting its author and is not a draft - i.e. a reviewer needs
// to act on it.
type Category = "no-reviewer" | "review" | "awaiting" | "draft";
type FilterKey = Category | "all";

type SortKey = "title" | "author" | "age" | "labels";
type SortDir = "asc" | "desc";

// Used to sort PRs into queues from GitHub's own data when the review report
// is unavailable.
const awaitingAuthorLabel = /^awaiting[- ]author$/i;
const reviewClaimedLabel = /^review[- ]claimed$/i;

function daysSince(dateStr: string) {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function categorize(
  pr: PullRequest,
  unreviewedNumbers: Set<number>,
  awaitingNumbers: Set<number>,
): Category {
  if (pr.draft) return "draft";
  if (awaitingNumbers.has(pr.number)) return "awaiting";
  if (unreviewedNumbers.has(pr.number)) return "no-reviewer";
  return "review";
}

function searchText(pr: PullRequest) {
  return [
    pr.title,
    `#${pr.number}`,
    pr.user?.login ?? "",
    ...pr.labels.map((label) => label.name),
    ...(pr.reviewers ?? []),
    pr.draft ? "draft" : "",
  ].join(" ").toLowerCase();
}

const filterLabels: { key: FilterKey; label: string; hint: string }[] = [
  {
    key: "no-reviewer",
    label: "Needs Reviewer",
    hint: "Ready for review, with no reviewer yet.",
  },
  {
    key: "review",
    label: "Needs Action",
    hint: "A reviewer is assigned and the review is pending.",
  },
  {
    key: "awaiting",
    label: "Awaiting Author",
    hint: "A reviewer has asked for changes.",
  },
  { key: "draft", label: "Draft", hint: "Not ready for review yet." },
  { key: "all", label: "All", hint: "" },
];

type Props = {
  prs: PullRequest[];
  queues?: { unreviewed: number[]; awaiting: number[] };
  complete: boolean;
  initialFilter?: string;
  initialQuery?: string;
};

const PR_PAGE_SIZE = 25;

export function PRTrackerClient({ prs, queues, complete, initialFilter, initialQuery }: Props) {
  // Without the review report, sort PRs into the same queues from GitHub's
  // labels and requested reviewers.
  const awaitingNumbers = new Set(
    queues
      ? queues.awaiting
      : prs.filter((p) => p.labels.some((l) => awaitingAuthorLabel.test(l.name))).map((p) => p.number),
  );
  const unreviewedNumbers = new Set(
    queues
      ? queues.unreviewed
      : prs
          .filter((p) => p.reviewers?.length === 0 && !p.labels.some((l) => reviewClaimedLabel.test(l.name)))
          .map((p) => p.number),
  );
  const categoryOf = (pr: PullRequest) => categorize(pr, unreviewedNumbers, awaitingNumbers);

  const counts = {
    "no-reviewer": prs.filter((p) => categoryOf(p) === "no-reviewer").length,
    review: prs.filter((p) => categoryOf(p) === "review").length,
    awaiting: prs.filter((p) => categoryOf(p) === "awaiting").length,
    draft: prs.filter((p) => categoryOf(p) === "draft").length,
    total: prs.length,
  };

  // Open on the PRs a new reviewer can pick up, when there are any.
  const defaultFilter: FilterKey = counts["no-reviewer"] > 0 ? "no-reviewer" : queues ? "review" : "all";
  const [filter, setFilter] = useState<FilterKey>(
    () => filterLabels.find(({ key }) => key === initialFilter)?.key ?? defaultFilter,
  );
  const [query, setQuery] = useState(initialQuery ?? "");
  const [paging, setPaging] = useState({ key: "", page: 1 });
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "age",
    dir: "asc",
  });

  function updateView(nextFilter: FilterKey, nextQuery: string) {
    setFilter(nextFilter);
    setQuery(nextQuery);
    const url = new URL(window.location.href);
    if (nextFilter === defaultFilter) url.searchParams.delete("show");
    else url.searchParams.set("show", nextFilter);
    if (nextQuery.trim()) url.searchParams.set("q", nextQuery.trim());
    else url.searchParams.delete("q");
    // Keep a shareable URL without adding a history entry per keystroke.
    window.history.replaceState(null, "", url);
  }

  const toggleSort = useCallback(
    (key: SortKey) => {
      setSort((prev) =>
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: "asc" },
      );
    },
    [],
  );

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matching = words.length
    ? prs.filter((p) => {
        const text = searchText(p);
        return words.every((word) => text.includes(word));
      })
    : prs;

  const visible = matching
    .filter((p) => filter === "all" || categoryOf(p) === filter)
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "title")
        return dir * a.title.localeCompare(b.title);
      if (sort.key === "author")
        return dir * (a.user?.login ?? "").localeCompare(b.user?.login ?? "");
      if (sort.key === "age")
        return dir * (daysSince(a.created_at) - daysSince(b.created_at));
      return (
        dir *
        a.labels
          .map((l) => l.name)
          .join()
          .localeCompare(b.labels.map((l) => l.name).join())
      );
    });

  // The table is paged; any change of filter, search or sort returns to page 1.
  const pagingKey = `${filter}|${query}|${sort.key}|${sort.dir}`;
  const pageCount = Math.max(1, Math.ceil(visible.length / PR_PAGE_SIZE));
  const page = Math.min(paging.key === pagingKey ? paging.page : 1, pageCount);
  const pageRows = visible.slice((page - 1) * PR_PAGE_SIZE, page * PR_PAGE_SIZE);

  const activeHint = filterLabels.find(({ key }) => key === filter)?.hint;

  return (
    <div>
      {/* Search */}
      <label className="mb-4 flex max-w-xl flex-col">
        <span className="sr-only">Search pull requests</span>
        <input
          type="search"
          value={query}
          onChange={(event) => updateView(filter, event.target.value)}
          placeholder="Search by title, number, author, or label"
          className="site-field"
        />
      </label>

      {/* The queue tiles are the filter: one tile per queue, pressed when shown. */}
      <div role="group" aria-label="Review status" className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {filterLabels.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => updateView(key, query)}
            className="rounded-(--radius) border border-border bg-surface px-4 py-4 text-left transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-(--accent-tint)"
          >
            <span className={`label-mono block ${filter === key ? "text-accent" : "text-muted"}`}>{label}</span>
            <span className="mt-2 block text-3xl font-medium tabular-nums" style={{ letterSpacing: "-0.04em" }}>
              {key === "all" ? matching.length : matching.filter((p) => categoryOf(p) === key).length}
            </span>
          </button>
        ))}
      </div>
      <p role="status" className="mb-4 text-sm text-muted">
        {activeHint}{" "}
        {words.length > 0 && (
          <>
            Showing {visible.length} matching &ldquo;{query.trim()}&rdquo;.{" "}
            <button
              type="button"
              onClick={() => updateView(filter, "")}
              className="text-accent hover:underline underline-offset-2"
            >
              Clear search
            </button>
          </>
        )}
      </p>

      {/* Table */}
      <div id="pr-table" className="scroll-mt-24 rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary">
              {(
                [
                  { key: "title", label: "Pull Request", w: "45%" },
                  { key: "author", label: "Author", w: "20%" },
                  { key: "age", label: "Age", w: "15%" },
                  { key: "labels", label: "Labels", w: "20%" },
                ] as const
              ).map(({ key, label, w }) => (
                <th
                  key={key}
                  scope="col"
                  style={{ width: w }}
                  aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className="p-0 text-left border-b border-border"
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    title={`Sort by ${label.toLowerCase()}`}
                    className="w-full px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  >
                    {label}{" "}
                    <span aria-hidden="true" className="opacity-40 text-xs">
                      {sort.key === key
                        ? sort.dir === "asc"
                          ? "▲"
                          : "▼"
                        : "⇅"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-muted"
                >
                  {words.length > 0
                    ? "No pull requests in this category match your search."
                    : "No pull requests in this category."}{" "}
                  {filter !== "all" && (
                    <button
                      type="button"
                      onClick={() => updateView("all", query)}
                      className="text-accent hover:underline underline-offset-2"
                    >
                      Show all open pull requests
                    </button>
                  )}
                </td>
              </tr>
            )}
            {pageRows.map((pr) => {
              const days = daysSince(pr.created_at);
              return (
                <tr
                  key={pr.number}
                  className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors align-top"
                >
                  <td className="px-4 py-3">
                    <a
                      href={pr.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline underline-offset-2 font-medium"
                    >
                      {pr.title}
                    </a>
                    <div className="text-xs text-muted mt-0.5">
                      #{pr.number}
                      {pr.reviewers && pr.reviewers.length > 0 && (
                        <> · review requested from {pr.reviewers.join(", ")}</>
                      )}
                      {" · "}
                      <a
                        href={`${pr.html_url}/files`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent hover:underline underline-offset-2"
                      >
                        changes ↗
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {pr.user ? (
                      <a
                        href={`https://github.com/${encodeURIComponent(pr.user.login)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline underline-offset-2"
                      >
                        {pr.user.login}
                      </a>
                    ) : "unknown"}
                  </td>
                  <td
                    title={`Opened ${pr.created_at.slice(0, 10)}`}
                    className={`px-4 py-3 font-mono text-xs ${
                      days > 30
                        ? "text-danger font-bold"
                        : days > 14
                          ? "text-warning"
                          : "text-muted"
                    }`}
                  >
                    {days === 0 ? "today" : days === 1 ? "1 day" : `${days}d`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {pr.labels.map((label) => (
                        <button
                          key={label.name}
                          type="button"
                          onClick={() => updateView(filter, label.name)}
                          title={`Show pull requests labeled ${label.name}`}
                          className={tagClass(labelTone(label.name))}
                        >
                          {label.name}
                        </button>
                      ))}
                      {pr.draft && (
                        <span className={tagClass("neutral")}>
                          draft
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ListPager
        page={page}
        pageSize={PR_PAGE_SIZE}
        total={visible.length}
        noun="pull requests"
        onChange={(next) => setPaging({ key: pagingKey, page: next })}
        scrollToId="pr-table"
      />
    </div>
  );
}
