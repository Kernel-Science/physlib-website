"use client";

import { useEffect, useMemo, useState } from "react";
import { Chevron } from "@/components/chevron";
import { ReferenceGroupLinks } from "@/components/references/references-sidebar";
import { ListPager } from "@/components/list-pager";
import type { Reference } from "@/lib/yaml";
import { authorLetterOf, authorGroupKey, subfolderGroupKey } from "@/lib/references-groups";
import { decodeReferencesHash, referenceAnchor, setReferencesHash, type ReferencesSelection } from "@/lib/references-hash";

type ViewMode = "cited" | "subfolder" | "author";

const viewOptions: { key: ViewMode; label: string }[] = [
  { key: "cited", label: "Most Cited" },
  { key: "subfolder", label: "By Subfolder" },
  { key: "author", label: "Alphabetical by Author" },
];

// Everything a visitor might type to find a reference: its title, authors,
// key, venue and year, and the Lean files that cite it. Every word of the
// query has to appear somewhere, in any order ("tong statistical", "landau
// 1976", "harmonicoscillator").
function searchText(ref: Reference): string {
  return [
    ref.key,
    ref.title ?? "",
    ...ref.authors,
    ref.venue,
    ref.year ?? "",
    ...ref.citations.map((c) => c.file),
  ]
    .join(" ")
    .toLowerCase();
}

function matchesSearch(haystack: string, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return terms.every((term) => haystack.includes(term));
}

function scholarUrl(reference: Reference): string | null {
  if (reference.url || !reference.title || reference.authors.length === 0) return null;
  const query = `${reference.title} ${reference.authors[0]}`;
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
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
      {(reference.authors.length > 0 || reference.venue || reference.year) && (
        <p className="text-xs text-muted mt-0.5">
          {[reference.authors.join(", "), reference.venue || reference.year]
            .filter(Boolean)
            .join(" — ")}
        </p>
      )}
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
  // Rendered inside the card's links row: the toggle sits on that line and
  // the opened list wraps onto a full-width line below it.
  return (
    <div className="contents">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
      >
        <Chevron open={open} className="size-2.5" />
        {open ? "Hide citations" : "Show citations"}
      </button>
      {open && (
        <ul className="mt-1 flex w-full basis-full flex-col gap-1">
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

function CopyLinkButton({ referenceKey }: { referenceKey: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const url = new URL(window.location.href);
        url.hash = referenceAnchor(referenceKey);
        navigator.clipboard
          ?.writeText(url.toString())
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {});
      }}
      className="text-xs text-muted hover:text-accent hover:underline underline-offset-2"
    >
      {copied ? "Link copied" : "Copy link"}
    </button>
  );
}

function ReferenceCard({
  reference,
  citations,
  countOverride,
  highlighted = false,
}: {
  reference: Reference;
  citations?: Reference["citations"];
  countOverride?: number;
  highlighted?: boolean;
}) {
  const shownCitations = citations ?? reference.citations;
  const count = countOverride ?? shownCitations.length;
  const scholar = scholarUrl(reference);
  return (
    <div
      className={`rounded-lg border bg-surface px-4 py-3 flex flex-col gap-2 ${
        highlighted ? "border-accent outline-2 outline-accent/40" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <ReferenceMeta reference={reference} />
        <span className="site-tag site-tag-neutral shrink-0 tabular-nums">
          {count} citation{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-[11px] text-muted bg-surface-secondary px-1.5 py-0.5 rounded">
          {reference.key}
        </code>
        {!reference.inBib && (
          <span className="site-tag site-tag-danger">
            missing bib entry
          </span>
        )}
        {scholar && (
          <a
            href={scholar}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted hover:text-accent hover:underline underline-offset-2"
          >
            Find on Google Scholar ↗
          </a>
        )}
        <CopyLinkButton referenceKey={reference.key} />
        <CitationsDisclosure reference={reference} citations={shownCitations} />
      </div>
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
        aria-expanded={open}
        className="flex items-center gap-2 w-full text-left mb-3 disabled:cursor-default"
      >
        <h2 className="text-lg font-semibold font-mono">{title}</h2>
        <span className="site-tag site-tag-neutral tabular-nums">
          {count}
        </span>
        <Chevron open={open} className="ml-auto text-muted" />
      </button>
      {open && <div className="flex flex-col gap-2 mb-2">{children}</div>}
    </section>
  );
}

const CITED_PAGE_SIZE = 20;

export function ReferencesClient({ references }: { references: Reference[] }) {
  const [selection, setSelection] = useState<ReferencesSelection>({ view: "cited" });
  const { view } = selection;
  const [search, setSearch] = useState("");
  const [openOverrides, setOpenOverrides] = useState<Map<string, boolean>>(new Map());
  // The reference a "#reference-<key>" link points at, outlined in the list.
  const linkedKey = selection.view === "cited" ? selection.reference : undefined;
  const searching = search.trim().length > 0;
  const [paging, setPaging] = useState({ key: "", page: 1 });

  const haystacks = useMemo(
    () => new Map(references.map((r) => [r.key, searchText(r)])),
    [references],
  );
  const filtered = useMemo(
    () => references.filter((r) => searching
      ? matchesSearch(haystacks.get(r.key) ?? "", search)
      : r.citations.length > 0 || r.key === linkedKey),
    [references, haystacks, search, searching, linkedKey],
  );

  const citedView = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => b.count - a.count || (a.title ?? a.key).localeCompare(b.title ?? b.key),
      ),
    [filtered],
  );

  // The "Most Cited" list is paged. The page resets whenever the search or
  // the linked reference changes, and a linked reference opens on its page.
  const pagingKey = `${search}|${linkedKey ?? ""}`;
  const linkedIndex = linkedKey ? citedView.findIndex((r) => r.key === linkedKey) : -1;
  const pageCount = Math.max(1, Math.ceil(citedView.length / CITED_PAGE_SIZE));
  const page = Math.min(
    paging.key === pagingKey ? paging.page : linkedIndex >= 0 ? Math.floor(linkedIndex / CITED_PAGE_SIZE) + 1 : 1,
    pageCount,
  );
  const citedPage = citedView.slice((page - 1) * CITED_PAGE_SIZE, page * CITED_PAGE_SIZE);

  const subfolderView = useMemo(() => {
    const groups = new Map<string, { reference: Reference; citations: Reference["citations"] }[]>();
    for (const ref of filtered) {
      const bySubfolder = new Map<string, Reference["citations"]>();
      if (ref.citations.length === 0) bySubfolder.set("No citing subfolder", []);
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

  // A reference permalink opens its card even if a prior search hid it.
  // Group links keep the current search and expand their matching section.
  useEffect(() => {
    function applyHash() {
      const selection = decodeReferencesHash();
      setSelection(selection);
      if (selection.view === "cited" && selection.reference) {
        const anchor = referenceAnchor(selection.reference);
        setSearch("");
        requestAnimationFrame(() => {
          document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      } else if (selection.view === "subfolder" && selection.subfolder) {
        const key = subfolderGroupKey(selection.subfolder);
        setOpenOverrides((prev) => new Map(prev).set(key, true));
        requestAnimationFrame(() => {
          document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      } else if (selection.view === "author" && selection.letter) {
        const key = authorGroupKey(selection.letter);
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
      <ReferenceGroupLinks selection={selection} groups={
        view === "author" ? authorView.map(({ letter }) => letter) : subfolderView.map(({ subfolder }) => subfolder)
      } />
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {viewOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setReferencesHash({ view: key })}
              aria-pressed={view === key}
              className={`px-3 py-1.5 text-sm rounded-(--radius) border transition-colors ${
                view === key
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border bg-surface hover:bg-surface-secondary"
              }`}
            >
              {label}
            </button>
          ))}
          {showAllToggle && (
            <button
              onClick={() => setAllGroups(!allOpen)}
              className="px-3 py-1.5 text-sm rounded-(--radius) border border-border bg-surface hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, author, year, or Lean file…"
          aria-label="Search references"
          className="site-field sm:ml-auto w-full sm:w-72"
        />
      </div>

      {searching && filtered.length > 0 && (
        <p role="status" className="mb-3 text-sm text-muted">
          {filtered.length} of {references.length} references match &ldquo;{search.trim()}&rdquo;.{" "}
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-accent hover:underline underline-offset-2"
          >
            Clear search
          </button>
        </p>
      )}

      {linkedKey && !haystacks.has(linkedKey) && (
        <p role="status" className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          No reference has the key{" "}
          <code className="font-mono text-xs">{linkedKey}</code>.
        </p>
      )}

      {searching && filtered.length === 0 && (
        <p role="status" className="text-sm text-muted">
          No references match &ldquo;{search.trim()}&rdquo;.{" "}
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-accent hover:underline underline-offset-2"
          >
            Clear search
          </button>
        </p>
      )}

      {view === "cited" && (
        <div id="reference-list" className="flex scroll-mt-24 flex-col gap-2">
          {citedPage.map((ref) => (
            <div key={ref.key} id={referenceAnchor(ref.key)} className="scroll-mt-24">
              <ReferenceCard reference={ref} highlighted={ref.key === linkedKey} />
            </div>
          ))}
          <ListPager
            page={page}
            pageSize={CITED_PAGE_SIZE}
            total={citedView.length}
            noun="references"
            onChange={(next) => setPaging({ key: pagingKey, page: next })}
            scrollToId="reference-list"
          />
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
