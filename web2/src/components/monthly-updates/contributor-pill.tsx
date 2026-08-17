import type { MonthlyContributor, MonthlyReviewer } from "@/lib/yaml";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function ContributorPill({ c }: { c: MonthlyContributor }) {
  const label = c.login ?? c.name ?? "unknown";
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary/60 pl-1 pr-2.5 py-1 text-xs text-foreground/80 hover:bg-surface-secondary transition-colors">
      {c.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.avatar_url}
          alt=""
          width={20}
          height={20}
          className="size-5 rounded-full"
        />
      ) : null}
      <span className="font-medium">{label}</span>
      <span className="text-muted font-mono text-[10px]">
        {formatNumber(c.linesChanged)}
      </span>
      {c.firstTime ? (
        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
          new
        </span>
      ) : null}
    </span>
  );
  if (c.html_url) {
    return (
      <a href={c.html_url} target="_blank" rel="noopener noreferrer" className="no-underline">
        {inner}
      </a>
    );
  }
  return inner;
}

export function ReviewerPill({ r }: { r: MonthlyReviewer }) {
  const label = r.name ?? r.login;
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary/60 pl-1 pr-2.5 py-1 text-xs text-foreground/80 hover:bg-surface-secondary transition-colors">
      {r.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.avatar_url}
          alt=""
          width={20}
          height={20}
          className="size-5 rounded-full"
        />
      ) : null}
      <span className="font-medium">{label}</span>
      <span className="text-muted font-mono text-[10px]">
        {r.reviews} review{r.reviews === 1 ? "" : "s"}
      </span>
    </span>
  );
  if (r.html_url) {
    return (
      <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="no-underline">
        {inner}
      </a>
    );
  }
  return inner;
}
