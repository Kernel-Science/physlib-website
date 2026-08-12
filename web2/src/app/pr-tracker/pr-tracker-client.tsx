"use client";

import { useEffect, useState, useCallback } from "react";
import { site } from "@/lib/site";

type Label = { name: string; color: string };

type PR = {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  created_at: string;
  user: { login: string } | null;
  labels: Label[];
};

// "review" ("Needs Action") = has an assigned reviewer, not awaiting author,
// not draft - i.e. a reviewer needs to actually act on it. "no-reviewer" is
// the separate, narrower case of nobody being assigned yet (matches the
// Worker's unreviewedPRs exactly) - it isn't a filter button below, only
// visible via "All" or the "In need of reviewer" stat further down the page.
type Category = "review" | "awaiting" | "draft" | "no-reviewer";

type SortKey = "title" | "author" | "age" | "labels";
type SortDir = "asc" | "desc";

function daysSince(dateStr: string) {
  return Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
}

function categorize(
  pr: PR,
  unreviewedNumbers: Set<number>,
  awaitingNumbers: Set<number>,
): Category {
  if (pr.draft) return "draft";
  if (awaitingNumbers.has(pr.number)) return "awaiting";
  if (unreviewedNumbers.has(pr.number)) return "no-reviewer";
  return "review";
}

function contrastColor(hex: string) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000" : "#fff";
}

type ReportData = {
  openPRs: PR[];
  unreviewedPRs: { number: number }[];
  awaitingAuthorPRs: { number: number }[];
};

async function fetchReport(): Promise<ReportData> {
  // Reuses the same computation the Zulip "/reviews" bot command uses,
  // rather than a separate direct GitHub call - one shared, authenticated,
  // cached data source instead of two independent fetches. Also pulls the
  // unreviewed/awaiting-author PR numbers so categorize() below matches the
  // bot's definitions exactly, instead of re-deriving a simplified version
  // from labels alone.
  const res = await fetch(site.reportApi);
  return (await res.json()) as ReportData;
}

const filterLabels: { key: Category | "all"; label: string; dot: string }[] = [
  { key: "review", label: "Needs Action", dot: "bg-danger" },
  { key: "awaiting", label: "Awaiting Author", dot: "bg-warning" },
  { key: "draft", label: "Draft", dot: "bg-accent" },
  { key: "all", label: "All", dot: "bg-foreground" },
];

export function PRTrackerClient() {
  const [prs, setPrs] = useState<PR[]>([]);
  const [unreviewedNumbers, setUnreviewedNumbers] = useState<Set<number>>(new Set());
  const [awaitingNumbers, setAwaitingNumbers] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [filter, setFilter] = useState<Category | "all">("review");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "age",
    dir: "asc",
  });

  useEffect(() => {
    fetchReport()
      .then((data) => {
        setPrs(data.openPRs);
        setUnreviewedNumbers(new Set(data.unreviewedPRs.map((pr) => pr.number)));
        setAwaitingNumbers(new Set(data.awaitingAuthorPRs.map((pr) => pr.number)));
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, []);

  const counts = {
    review: prs.filter((p) => categorize(p, unreviewedNumbers, awaitingNumbers) === "review").length,
    awaiting: prs.filter((p) => categorize(p, unreviewedNumbers, awaitingNumbers) === "awaiting").length,
    draft: prs.filter((p) => categorize(p, unreviewedNumbers, awaitingNumbers) === "draft").length,
    total: prs.length,
  };

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

  const visible = prs
    .filter((p) => filter === "all" || categorize(p, unreviewedNumbers, awaitingNumbers) === filter)
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

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Loading pull requests…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center py-20 text-danger">
        Failed to load pull requests. Please try refreshing the page.
      </div>
    );
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {[
          { label: "Needs Action", count: counts.review, color: "border-l-danger" },
          { label: "Awaiting Author", count: counts.awaiting, color: "border-l-warning" },
          { label: "Draft", count: counts.draft, color: "border-l-accent" },
          { label: "Total Open", count: counts.total, color: "border-l-foreground/40" },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            className={`rounded-lg border border-border bg-surface px-4 py-4 border-l-4 ${color} text-center`}
          >
            <div className="text-2xl font-bold">{count}</div>
            <div className="text-xs text-muted mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterLabels.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filter === key
                ? "bg-accent text-white border-accent"
                : "border-border bg-surface hover:bg-surface-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-x-auto">
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
                  style={{ width: w }}
                  onClick={() => toggleSort(key)}
                  className="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-surface border-b border-border"
                >
                  {label}{" "}
                  <span className="opacity-40 text-xs">
                    {sort.key === key
                      ? sort.dir === "asc"
                        ? "▲"
                        : "▼"
                      : "⇅"}
                  </span>
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
                  No pull requests in this category.
                </td>
              </tr>
            )}
            {visible.map((pr) => {
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
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`https://github.com/${pr.user?.login}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline underline-offset-2"
                    >
                      {pr.user?.login ?? "unknown"}
                    </a>
                  </td>
                  <td
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
                        <span
                          key={label.name}
                          className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `#${label.color}`,
                            color: contrastColor(label.color),
                          }}
                        >
                          {label.name}
                        </span>
                      ))}
                      {pr.draft && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent">
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
    </div>
  );
}
