"use client";

type Props = {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  total: number;
  /** What is being listed, plural, e.g. "references". */
  noun: string;
  onChange: (page: number) => void;
  /** Element to scroll back to when the page changes. */
  scrollToId?: string;
};

const buttonClass =
  "rounded-(--radius) border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground";

/** Previous / next controls for a long list, with a "Showing a–b of n" count. */
export function ListPager({ page, pageSize, total, noun, onChange, scrollToId }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const go = (next: number) => {
    onChange(next);
    if (scrollToId) document.getElementById(scrollToId)?.scrollIntoView({ block: "start" });
  };
  return (
    <nav aria-label={`Pages of ${noun}`} className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" aria-live="polite">
        Showing {first}–{last} of {total} {noun}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => go(page - 1)}>
          ← Previous
        </button>
        <span className="px-1 text-sm text-muted">
          Page {page} of {pageCount}
        </span>
        <button type="button" className={buttonClass} disabled={page >= pageCount} onClick={() => go(page + 1)}>
          Next →
        </button>
      </div>
    </nav>
  );
}
