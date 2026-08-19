"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiMap, ApiMapNode } from "@/lib/yaml";
import {
  buildApiMapForest,
  flattenApiMapForest,
  type ApiMapTreeEntry,
} from "@/lib/api-map-tree";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { API_STATUS_DOT, API_STATUS_LABEL, apiStatusKind } from "@/lib/api-map-status";
import { TopRightArrowIcon } from "@/components/monthly-updates/icons";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"}
      />
    </svg>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted/70">
      {children}
    </h2>
  );
}

/**
 * A requirement's `location` is free text, but is conventionally a repo path
 * optionally followed by the declaration names in parentheses. Link the path
 * part when it looks unambiguously like one, and otherwise leave the whole
 * string as plain text - a guessed link that 404s is worse than no link.
 */
function RequirementLocation({
  location,
  repo,
  branch,
}: {
  location: string;
  repo: string;
  branch: string;
}) {
  const match = location.match(/^([A-Za-z0-9_./-]+\.lean)(.*)$/);
  if (!match) {
    return <span className="text-muted/70">{location}</span>;
  }
  const [, file, rest] = match;
  return (
    <span className="text-muted/70">
      <a
        href={`https://github.com/${repo}/blob/${branch}/${file}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent hover:underline underline-offset-2"
      >
        {file}
      </a>
      {rest}
    </span>
  );
}

/** A related API. Only navigable when it actually appears in the list the
 *  sidebar and the pager walk; secondary parents pointing at a bare .lean
 *  file often don't, and a dead link would strand the reader. */
function RelationChip({
  label,
  path,
  navigable,
}: {
  label: string;
  path: string;
  navigable: boolean;
}) {
  const shared = "rounded-lg border border-border px-2.5 py-1 text-xs";
  if (!navigable) {
    return (
      <span className={`${shared} bg-surface-secondary/50 text-muted`} title={path}>
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => selectApiMapEntry(path)}
      title={path}
      className={`${shared} bg-surface-secondary text-foreground transition-colors hover:border-accent hover:text-accent`}
    >
      {label}
    </button>
  );
}

export function ApiDetailView({ apiMap }: { apiMap: ApiMap }) {
  const { nodes, repo, branch } = apiMap;

  const entries = useMemo(
    () => flattenApiMapForest(buildApiMapForest(nodes)),
    [nodes],
  );
  const knownPaths = useMemo(() => new Set(entries.map((e) => e.path)), [entries]);

  /** Inverse of ParentAPIs: who lists this path as a dependency. Without the
   *  tree drawing them, this is the only way the downstream edges stay
   *  visible from a single API's page. */
  const dependentsOf = useMemo(() => {
    const map = new Map<string, ApiMapNode[]>();
    for (const node of nodes) {
      for (const parent of node.parents) {
        const list = map.get(parent.path) ?? [];
        list.push(node);
        map.set(parent.path, list);
      }
    }
    return map;
  }, [nodes]);

  const [activePath, setActivePath] = useState("");
  useEffect(() => {
    const onHashChange = () =>
      setActivePath(decodeURIComponent(window.location.hash.replace(/^#/, "")));
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const found = entries.findIndex((e) => e.path === activePath);
  // Nothing selected yet (or a hash naming something that isn't in the map):
  // fall back to the first entry so the page is never blank.
  const index = found >= 0 ? found : 0;
  const current: ApiMapTreeEntry | undefined = entries[index];

  const go = useCallback(
    (delta: number) => {
      const next = entries[index + delta];
      if (next) selectApiMapEntry(next.path);
    },
    [entries, index],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go]);

  if (!current) return null;

  const { node, title, path } = current;
  const kind = node ? apiStatusKind(node) : null;
  const done = node ? node.requirements.filter((r) => r.done).length : 0;
  const total = node ? node.requirements.length : 0;
  const overviewParagraphs = node ? node.overview.split(/\n\s*\n/).filter(Boolean) : [];
  const dependents = dependentsOf.get(path) ?? [];

  const navButton =
    "flex size-9 items-center justify-center rounded-lg border border-border text-muted transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30";

  return (
    <div>
      {/* Pager */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          aria-label="Previous API"
          className={navButton}
        >
          <ChevronIcon direction="left" />
        </button>
        <p className="text-xs text-muted">
          {index + 1} of {entries.length}
        </p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === entries.length - 1}
          aria-label="Next API"
          className={navButton}
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      <article className="rounded-xl border border-border bg-surface p-6">
        <header className="mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 break-all font-mono text-xs text-muted">{path}</p>
            </div>
            {node && (
              <a
                href={node.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
              >
                View on GitHub
                <TopRightArrowIcon className="size-3" />
              </a>
            )}
          </div>

          {node && kind && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between text-xs">
                <span className="font-medium">{API_STATUS_LABEL[kind]}</span>
                <span className="text-muted">
                  {total > 0 ? `${done} of ${total} requirements done` : "—"}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full ${API_STATUS_DOT[kind]}`}
                  style={{ width: total > 0 ? `${(done / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          )}
        </header>

        {!node && (
          <p className="mb-5 rounded-lg border border-dashed border-border bg-surface-secondary/50 p-4 text-sm text-muted">
            This API is referenced as a dependency but has no{" "}
            <code>API-map.yaml</code> of its own yet, so there is no overview or
            requirements list to show.
          </p>
        )}

        {overviewParagraphs.length > 0 && (
          <section className="mb-6">
            <SectionHeading>Overview</SectionHeading>
            <div className="space-y-3 text-sm leading-relaxed text-foreground/80">
              {overviewParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {node && total > 0 && (
          <section className="mb-6">
            <SectionHeading>Requirements</SectionHeading>
            <ul className="space-y-2">
              {node.requirements.map((r, i) => (
                <li
                  key={i}
                  className="flex gap-3 rounded-lg border border-border/60 bg-surface-secondary/40 p-3"
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 shrink-0 text-sm ${r.done ? "text-success" : "text-muted/50"}`}
                  >
                    {r.done ? "✓" : "○"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug ${r.done ? "text-foreground/80" : "text-muted"}`}
                    >
                      {r.description}
                    </p>
                    {r.location !== "N/A" && (
                      <p className="mt-1 break-all font-mono text-[11px] leading-snug">
                        <RequirementLocation
                          location={r.location}
                          repo={repo}
                          branch={branch}
                        />
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {node && node.references.length > 0 && (
          <section className="mb-6">
            <SectionHeading>References</SectionHeading>
            <ul className="space-y-1.5">
              {node.references.map((ref, i) => (
                <li key={i} className="text-sm leading-snug text-muted">
                  {/^https?:\/\//.test(ref) ? (
                    <a
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-accent hover:underline underline-offset-2"
                    >
                      {ref}
                    </a>
                  ) : (
                    ref
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {node && node.parents.length > 0 && (
            <section>
              <SectionHeading>Depends on</SectionHeading>
              <div className="flex flex-wrap gap-1.5">
                {node.parents.map((p) => (
                  <RelationChip
                    key={p.path}
                    label={p.name}
                    path={p.path}
                    navigable={knownPaths.has(p.path)}
                  />
                ))}
              </div>
            </section>
          )}
          {dependents.length > 0 && (
            <section>
              <SectionHeading>Required by</SectionHeading>
              <div className="flex flex-wrap gap-1.5">
                {dependents.map((d) => (
                  <RelationChip
                    key={d.path}
                    label={d.title}
                    path={d.path}
                    navigable={knownPaths.has(d.path)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
