"use client";

import { useEffect, useMemo, useState } from "react";
import type { Reference } from "@/lib/yaml";
import { authorLetterOf, authorGroupKey, subfolderGroupKey } from "@/lib/references-groups";
import { decodeReferencesHash, setReferencesHash } from "@/lib/references-hash";

type ViewMode = "cited" | "subfolder" | "author";

const viewOptions: { key: ViewMode; label: string }[] = [
  { key: "cited", label: "Most Cited" },
  { key: "subfolder", label: "By Subfolder" },
  { key: "author", label: "Alphabetical by Author" },
];

function matchesSearch(ref: Reference, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    ref.key.toLowerCase().includes(q) ||
    (ref.title ?? "").toLowerCase().includes(q) ||
    ref.authors.some((a) => a.toLowerCase().includes(q)) ||
    ref.venue.toLowerCase().includes(q)
  );
}

function ReferenceMeta({ reference }: { reference: Reference }) {
  const title = reference.title ?? reference.key;
  return (
    <div className="min-w-0">
      <p className="font-medium text-sm leading-snug">
        {reference.url ? (
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-accent hover:underline underline-offset-2"
          >
            {title}
          </a>
        ) : (
          title
        )}
      </p>
      <p className="text-xs text-muted mt-0.5">
        {reference.authors.length > 0 ? reference.authors.join(", ") : "Unknown author"}
        {reference.venue ? ` — ${reference.venue}` : ""}
      </p>
    </div>
  );
}

function CitationsDisclosure({
  reference,
  citations,
}: {
  reference: Reference;
  citations: Reference["citations"];
}) {
  const [open, setOpen] = useState(false);
  if (citations.length === 0) {
    return <p className="text-xs text-muted italic">Not yet cited anywhere in the repo.</p>;
  }
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted hover:text-foreground transition-colors"
      >
        {open ? "▲ Hide" : "▼ Show"} {citations.length} citation
        {citations.length !== 1 ? "s" : ""}
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1">
          {citations.map((c) => (
            <li key={`${reference.key}-${c.file}-${c.line}`} className="text-xs">
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-muted hover:text-accent hover:underline underline-offset-2"
              >
                {c.file}:{c.line}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReferenceCard({
  reference,
  citations,
  countOverride,
}: {
  reference: Reference;
  citations?: Reference["citations"];
  countOverride?: number;
}) {
  const shownCitations = citations ?? reference.citations;
  const count = countOverride ?? shownCitations.length;
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ReferenceMeta reference={reference} />
        <span className="shrink-0 text-xs text-muted border border-border rounded-full px-2 py-0.5">
          {count} citation{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-[11px] text-muted bg-surface-secondary px-1.5 py-0.5 rounded">
          {reference.key}
        </code>
        {!reference.inBib && (
          <span className="text-xs font-medium text-danger border border-danger/30 bg-danger/10 rounded-full px-2 py-0.5">
            missing bib entry
          </span>
        )}
      </div>
      <CitationsDisclosure reference={reference} citations={shownCitations} />
    </div>
  );
}

function CollapsibleSection({
  id,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  count: number;
  open: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <button
        onClick={onToggle}
        disabled={!onToggle}
        className="flex items-center gap-2 w-full text-left mb-3 disabled:cursor-default"
      >
        <h2 className="text-lg font-semibold font-mono">{title}</h2>
        <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5">
          {count}
        </span>
        <span className="ml-auto text-muted text-sm">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="flex flex-col gap-2 mb-2">{children}</div>}
    </section>
  );
}

export function ReferencesClient({ references }: { references: Reference[]; repo: string; branch: string }) {
  const [view, setView] = useState<ViewMode>("cited");
  const [search, setSearch] = useState("");
  const [openOverrides, setOpenOverrides] = useState<Map<string, boolean>>(new Map());

  const filtered = useMemo(
    () => references.filter((r) => matchesSearch(r, search)),
    [references, search],
  );

  const citedView = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => b.count - a.count || (a.title ?? a.key).localeCompare(b.title ?? b.key),
      ),
    [filtered],
  );

  const subfolderView = useMemo(() => {
    const groups = new Map<string, { reference: Reference; citations: Reference["citations"] }[]>();
    for (const ref of filtered) {
      const bySubfolder = new Map<string, Reference["citations"]>();
      for (const c of ref.citations) {
        const list = bySubfolder.get(c.subfolder) ?? [];
        list.push(c);
        bySubfolder.set(c.subfolder, list);
      }
      for (const [subfolder, citations] of bySubfolder) {
        const list = groups.get(subfolder) ?? [];
        list.push({ reference: ref, citations });
        groups.set(subfolder, list);
      }
    }
    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([subfolder, entries]) => ({
        subfolder,
        entries: entries.sort(
          (a, b) =>
            b.citations.length - a.citations.length ||
            (a.reference.title ?? a.reference.key).localeCompare(b.reference.title ?? b.reference.key),
        ),
      }));
  }, [filtered]);

  const authorView = useMemo(() => {
    const groups = new Map<string, Reference[]>();
    for (const ref of filtered) {
      const key = authorLetterOf(ref);
      const list = groups.get(key) ?? [];
      list.push(ref);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .sort((a, b) => (a[0] === "#" ? 1 : b[0] === "#" ? -1 : a[0].localeCompare(b[0])))
      .map(([letter, refs]) => ({
        letter,
        refs: refs.sort(
          (a, b) => a.authorSortKey.localeCompare(b.authorSortKey) || a.key.localeCompare(b.key),
        ),
      }));
  }, [filtered]);

  const groupKeys = useMemo(() => {
    if (view === "subfolder") return subfolderView.map(({ subfolder }) => subfolderGroupKey(subfolder));
    if (view === "author") return authorView.map(({ letter }) => authorGroupKey(letter));
    return [];
  }, [view, subfolderView, authorView]);

  const groupCount = groupKeys.length;
  // While searching, every group shown already contains only matching entries
  // (see `filtered`) - so force them all open rather than hiding a match
  // behind a section the user collapsed before searching.
  const searching = search.trim().length > 0;
  const isGroupOpen = (key: string) => openOverrides.get(key) ?? true;
  const displayGroupOpen = (key: string) => searching || isGroupOpen(key);
  const toggleGroup = (key: string) => {
    setOpenOverrides((prev) => {
      const next = new Map(prev);
      next.set(key, !isGroupOpen(key));
      return next;
    });
  };
  const setAllGroups = (open: boolean) => {
    setOpenOverrides((prev) => {
      const next = new Map(prev);
      for (const key of groupKeys) next.set(key, open);
      return next;
    });
  };
  const allOpen = groupCount > 0 && groupKeys.every((key) => isGroupOpen(key));
  const showAllToggle = groupCount > 0 && !searching;

  // The sidebar (mounted separately - see ConditionalSidebar) drives this
  // page's view through the URL hash rather than through React state, since
  // the two components don't otherwise share a parent - and the tab buttons
  // below write to that same hash so the sidebar stays in sync with them
  // too. A plain view switch (no group named) just changes the tab; a
  // specific group (from a sidebar click) also force-opens that section even
  // if it was collapsed, clears any search that might hide it, and scrolls
  // it into view.
  useEffect(() => {
    function applyHash() {
      const selection = decodeReferencesHash();
      setView(selection.view);
      if (selection.view === "subfolder" && selection.subfolder) {
        const key = subfolderGroupKey(selection.subfolder);
        setSearch("");
        setOpenOverrides((prev) => new Map(prev).set(key, true));
        requestAnimationFrame(() => {
          document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else if (selection.view === "author" && selection.letter) {
        const key = authorGroupKey(selection.letter);
        setSearch("");
        setOpenOverrides((prev) => new Map(prev).set(key, true));
        requestAnimationFrame(() => {
          document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {viewOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setReferencesHash({ view: key })}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                view === key
                  ? "bg-accent text-white border-accent"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              {label}
            </button>
          ))}
          {showAllToggle && (
            <button
              onClick={() => setAllGroups(!allOpen)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-surface hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, author, or key…"
          className="sm:ml-auto w-full sm:w-64 px-3 py-1.5 text-sm rounded-lg border border-border bg-surface placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted italic">No references match &ldquo;{search}&rdquo;.</p>
      )}

      {view === "cited" && (
        <div className="flex flex-col gap-2">
          {citedView.map((ref) => (
            <ReferenceCard key={ref.key} reference={ref} />
          ))}
        </div>
      )}

      {view === "subfolder" && (
        <div className="flex flex-col gap-6">
          {subfolderView.map(({ subfolder, entries }) => {
            const key = subfolderGroupKey(subfolder);
            return (
              <CollapsibleSection
                key={subfolder}
                id={key}
                title={subfolder}
                count={entries.length}
                open={displayGroupOpen(key)}
                onToggle={searching ? undefined : () => toggleGroup(key)}
              >
                {entries.map(({ reference, citations }) => (
                  <ReferenceCard
                    key={reference.key}
                    reference={reference}
                    citations={citations}
                    countOverride={citations.length}
                  />
                ))}
              </CollapsibleSection>
            );
          })}
        </div>
      )}

      {view === "author" && (
        <div className="flex flex-col gap-6">
          {authorView.map(({ letter, refs }) => {
            const key = authorGroupKey(letter);
            return (
              <CollapsibleSection
                key={letter}
                id={key}
                title={letter}
                count={refs.length}
                open={displayGroupOpen(key)}
                onToggle={searching ? undefined : () => toggleGroup(key)}
              >
                {refs.map((ref) => (
                  <ReferenceCard key={ref.key} reference={ref} />
                ))}
              </CollapsibleSection>
            );
          })}
        </div>
      )}
    </div>
  );
}
