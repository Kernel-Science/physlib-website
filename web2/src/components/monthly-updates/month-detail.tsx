import type { MonthlyUpdate } from "@/lib/yaml";
import { ContributorPill, ReviewerPill } from "./contributor-pill";
import { PdfLink } from "./pdf-link";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatDateRange(startISO: string, endISOExclusive: string): string {
  const start = new Date(startISO);
  const endInclusive = new Date(new Date(endISOExclusive).getTime() - 86_400_000);
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
  return `${start.getUTCDate()}–${endInclusive.getUTCDate()} ${monthFmt.format(start)} ${start.getUTCFullYear()}`;
}

const KIND_LABELS: Record<string, string> = {
  def: "Definitions",
  lemma: "Lemmas",
  theorem: "Theorems",
  instance: "Instances",
  abbrev: "Abbreviations",
  inductive: "Inductive types",
  structure: "Structures",
  informal_definition: "Informal definitions",
  informal_lemma: "Informal lemmas",
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted/70">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export function MonthDetail({ data }: { data: MonthlyUpdate }) {
  const kindEntries = Object.entries(data.kindTotals)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const totalDeclarations = kindEntries.reduce((sum, [, count]) => sum + count, 0);

  const topSubfolders = [...(data.subfolders ?? [])]
    .map((s) => ({ ...s, linesChanged: s.additions + s.deletions }))
    .sort((a, b) => b.linesChanged - a.linesChanged)
    .slice(0, 8);
  const maxSubfolderLines = topSubfolders[0]?.linesChanged ?? 1;

  const hasCitation = Boolean(data.zenodoDoi || data.zenodoUrl);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{data.label}</h2>
          <p className="mt-1 text-sm text-muted">
            {formatDateRange(data.startDate, data.endDate)} &middot;{" "}
            <a
              href={`https://github.com/${data.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent hover:underline underline-offset-2"
            >
              {data.repo}
            </a>
          </p>
        </div>
        <PdfLink href={data.pdfUrl} />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Lines changed"
          value={formatNumber(data.linesChanged)}
          sub={`+${formatNumber(data.totalAdditions)} −${formatNumber(data.totalDeletions)}`}
        />
        <StatCard label="Commits" value={formatNumber(data.totalCommits)} />
        <StatCard
          label="Contributors"
          value={formatNumber(data.contributors.length)}
          sub={
            data.contributors.some((c) => c.firstTime)
              ? `${data.contributors.filter((c) => c.firstTime).length} first-time`
              : undefined
          }
        />
        <StatCard
          label="New declarations"
          value={formatNumber(totalDeclarations)}
          sub={`across ${formatNumber(data.files.length)} files`}
        />
      </div>

      {data.totalFilesChanged !== undefined && (
        <p className="text-sm text-muted">
          {formatNumber(data.totalFilesChanged)} files touched this month
          {data.filesAdded ? `, ${formatNumber(data.filesAdded)} added` : ""}
          {data.filesRemoved ? `, ${formatNumber(data.filesRemoved)} removed` : ""}.
        </p>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted/70">
          Contributors
        </h3>
        {data.contributors.length === 0 ? (
          <p className="text-sm text-muted">No commits recorded this month.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.contributors.map((c, i) => (
              <ContributorPill key={c.login ?? c.name ?? `anon-${i}`} c={c} />
            ))}
          </div>
        )}
      </section>

      {data.reviewers && data.reviewers.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted/70">
            Reviewers
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.reviewers.map((r) => (
              <ReviewerPill key={r.login} r={r} />
            ))}
          </div>
        </section>
      )}

      {kindEntries.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted/70">
            New declarations by kind
          </h3>
          <div className="flex flex-wrap gap-2">
            {kindEntries.map(([kind, count]) => (
              <span
                key={kind}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary/60 px-3 py-1 text-xs"
              >
                <span className="font-semibold">{formatNumber(count)}</span>
                <span className="text-muted">{KIND_LABELS[kind] ?? kind}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {topSubfolders.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted/70">
            Most active areas
          </h3>
          <div className="flex flex-col gap-2">
            {topSubfolders.map((s) => (
              <div key={s.path} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate font-mono text-xs text-foreground/80" title={s.path}>
                  {s.path}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full bg-accent/60"
                    style={{ width: `${Math.max((s.linesChanged / maxSubfolderLines) * 100, 3)}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-muted">
                  {formatNumber(s.linesChanged)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {hasCitation && (
        <section className="rounded-xl border border-border bg-surface-secondary/40 p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted/70">
            Cite this report
          </h3>
          <p className="text-sm text-foreground/90">
            This report is archived on Zenodo with a permanent DOI, so it can
            be cited as a stand-alone, citable record of work completed this
            month.
          </p>
          <a
            href={data.zenodoUrl ?? `https://doi.org/${data.zenodoDoi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-mono text-sm text-accent hover:underline underline-offset-2"
          >
            {data.zenodoDoi ? `doi.org/${data.zenodoDoi}` : data.zenodoUrl}
          </a>
        </section>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <a
          href={data.compareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent hover:underline underline-offset-2"
        >
          View full diff on GitHub
        </a>
        <a
          href={data.commitsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-accent hover:underline underline-offset-2"
        >
          View commits
        </a>
      </div>
    </div>
  );
}
