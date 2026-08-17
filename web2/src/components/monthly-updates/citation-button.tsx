"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { MonthlyContributor, MonthlyUpdate } from "@/lib/yaml";
import { site } from "@/lib/site";
import { CheckIcon, CopyIcon, QuoteIcon } from "./icons";

// gets the name of the repo
function repoFrom(repo: string): string {
  const owner = repo.split("/")[0] ?? "";
  return owner.replace(/[-_]+/g, " ").trim() || "Physlib";
}

function citationUrl(slug: string): string {
  return `${site.url}/monthly-updates/${slug}`;
}

// Best-effort human name for a contributor, matching the same fallback the
// rest of the report uses (profile name → GitHub login → "unknown").
function contributorDisplayName(c: MonthlyContributor): string {
  return c.name?.trim() || c.login?.trim() || "Unknown Contributor";
}

// Best-effort surname for alphabetical sorting. Names like "Alex Zughaid"
// split cleanly; single-word logins ("nateabr") fall back to the whole
// token, which is what we'd sort them by anyway.
function surnameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

// "Alex Zughaid" → "Zughaid, A."; "Bjørn Kjos-Hanssen" → "Kjos-Hanssen, B.";
// "nateabr" → "nateabr" (no inversion possible on a single-word handle).
function invertedName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return fullName;
  const surname = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((p) => `${p[0]?.toUpperCase() ?? ""}.`)
    .join("");
  return `${surname}, ${initials}`;
}

// Harvard (Bath) joins author lists with commas and an "and" before the
// final entry - no Oxford comma. Empty and single-entry cases fall through
// naturally.
function joinAuthorsHarvard(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function contributorsAsAuthors(data: MonthlyUpdate): MonthlyContributor[] {
  // Alphabetical by surname so the author list reads like an academic
  // byline, distinct from the PDF's first-name sort inside the report body.
  return [...data.contributors].sort((a, b) =>
    surnameOf(contributorDisplayName(a)).localeCompare(
      surnameOf(contributorDisplayName(b)),
      "en",
    ),
  );
}

// `data.label` uses the LaTeX-friendly short month ("Jun 2026"). A citation
// reads better spelled out, so we reconstruct it from `year`/`month`.
function longPeriod(data: MonthlyUpdate): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(data.year, data.month - 1, 1)));
}

// replace links with DOI links when available
function harvardBathReference(data: MonthlyUpdate, accessed: Date): string {
  const publisher = "Zenodo";
  const accessedStr = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(accessed);
  const authors = joinAuthorsHarvard(
    contributorsAsAuthors(data).map((c) => invertedName(contributorDisplayName(c))),
  );
  const url = citationUrl(data.slug);
  const doiSuffix = data.zenodoDoi ? ` doi: ${data.zenodoDoi}.` : "";
  return (
    `${authors} (${data.year}) ` +
    `Physlib monthly progress report: ${longPeriod(data)} [PDF]. ` +
    `${publisher}. Available from: ${url} ` +
    `[Accessed ${accessedStr}].${doiSuffix}`
  );
}

const BIBTEX_MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

// BibTeX author strings use " and " as the separator between entries;
// "Surname, Firstname(s)" tells the style what to treat as the family name.
function bibTexAuthorField(data: MonthlyUpdate): string {
  return contributorsAsAuthors(data)
    .map((c) => {
      const full = contributorDisplayName(c);
      const parts = full.trim().split(/\s+/);
      if (parts.length < 2) return `{${full}}`;
      const surname = parts[parts.length - 1];
      const given = parts.slice(0, -1).join(" ");
      return `${surname}, ${given}`;
    })
    .join(" and ");
}

function bibTexRecord(data: MonthlyUpdate, accessed: Date): string {
  const publisher = "Zenodo";
  const monthMacro = BIBTEX_MONTHS[data.month - 1] ?? "jan";
  const key = `physlib-${data.slug}`;
  const urldate = accessed.toISOString().slice(0, 10);
  const url = citationUrl(data.slug);
  // Publication date: the day the report was generated. `generatedAt` is
  // ISO 8601, we only want YYYY-MM-DD in the record.
  const pubDate = data.generatedAt.slice(0, 10);
  const lines = [
    `@techreport{${key},`,
    `  author       = {${bibTexAuthorField(data)}},`,
    `  title        = {Physlib monthly progress report: ${longPeriod(data)}},`,
    `  institution  = {${publisher}},`,
    `  year         = {${data.year}},`,
    `  month        = ${monthMacro},`,
    `  date         = {${pubDate}},`,
    `  url          = {${url}},`,
    `  urldate      = {${urldate}},`,
  ];
  if (data.zenodoDoi) lines.push(`  doi          = {${data.zenodoDoi}},`);
  lines.push(`  note         = {Accessed ${urldate}.},`);
  lines.push("}");
  return lines.join("\n");
}

// Data URLs are used instead of blob URLs so the download link remains
// valid across re-renders and doesn't need lifecycle cleanup - the
// generated .bib is small (a few hundred bytes) and embedding it directly
// costs nothing here.
function bibTexDataUrl(bibText: string): string {
  return `data:application/x-bibtex;charset=utf-8,${encodeURIComponent(bibText)}`;
}

export function CitationButton({ data }: { data: MonthlyUpdate }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Access date is captured once when the popover opens, so the reference
  // text and the .bib file cite the same day even if the user leaves the
  // popover open across midnight.
  const [accessedAt, setAccessedAt] = useState<Date | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setCopied(false);
    // Return focus to the trigger for keyboard users, matching typical
    // popover/dialog behaviour.
    buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    setAccessedAt(new Date());

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onPointer(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, close]);

  const accessed = accessedAt ?? new Date();
  const reference = harvardBathReference(data, accessed);
  const bibText = bibTexRecord(data, accessed);
  const bibHref = bibTexDataUrl(bibText);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API can reject in insecure contexts or when the user has
      // denied permission. The reference is still selectable in the box, so
      // silently no-op rather than throwing an error the user can't act on.
    }
  }, [reference]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:border-accent/40 hover:text-accent"
      >
        <QuoteIcon />
        Cite
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Cite this report"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 shadow-lg"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Cite this report</h3>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded p-1 text-muted hover:bg-surface-secondary/60 hover:text-foreground"
            >
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
                  d="M6 6l12 12M18 6L6 18"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
                Harvard (Bath)
              </span>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-muted transition-colors hover:text-accent"
              >
                {copied ? (
                  <>
                    <CheckIcon className="size-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="max-h-56 select-text overflow-y-auto rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-xs leading-relaxed text-foreground/90">
              {reference}
            </p>
          </div>

          <div className="mt-3 border-t border-border pt-2.5">
            <a
              href={bibHref}
              download={`physlib-${data.slug}.bib`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline underline-offset-2"
            >
              Download BibTeX
              <svg
                aria-hidden
                className="size-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16"
                />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


