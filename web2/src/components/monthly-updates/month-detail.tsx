import type { MonthlyUpdate } from "@/lib/yaml";
import { ContributorPill, ReviewerPill } from "./contributor-pill";
import { PdfLink } from "./pdf-link";
import { PdfViewer } from "./pdf-viewer";

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

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted/70">
        {title}
      </h3>
      {children}
    </section>
  );
}

function StatRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right">
        <span className="font-semibold">{value}</span>
        {sub ? <span className="ml-1.5 text-xs text-muted">{sub}</span> : null}
      </span>
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
    .slice(0, 6);

  const hasCitation = Boolean(data.zenodoDoi || data.zenodoUrl);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Main: the report itself */}
      <div className="min-w-0 flex-1 lg:sticky lg:top-20">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
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

        {data.pdfUrl ? (
          <PdfViewer url={data.pdfUrl} title={`${data.label} report PDF`} />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-muted">
            This report hasn&apos;t been generated yet. It will appear here
            once it&apos;s published.
          </div>
        )}
      </div>

      {/* Sidebar: supplementary stats */}
      <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-72">
        <SidebarSection title="Overview">
          <div className="divide-y divide-border rounded-xl border border-border bg-surface px-3">
            <StatRow
              label="Lines changed"
              value={formatNumber(data.linesChanged)}
              sub={`+${formatNumber(data.totalAdditions)} −${formatNumber(data.totalDeletions)}`}
            />
            <StatRow label="Commits" value={formatNumber(data.totalCommits)} />
            <StatRow
              label="Contributors"
              value={formatNumber(data.contributors.length)}
              sub={
                data.contributors.some((c) => c.firstTime)
                  ? `${data.contributors.filter((c) => c.firstTime).length} first-time`
                  : undefined
              }
            />
            <StatRow
              label="New declarations"
              value={formatNumber(totalDeclarations)}
              sub={`${formatNumber(data.files.length)} files`}
            />
            {data.totalFilesChanged !== undefined && (
              <StatRow
                label="Files touched"
                value={formatNumber(data.totalFilesChanged)}
                sub={
                  data.filesAdded || data.filesRemoved
                    ? `+${formatNumber(data.filesAdded ?? 0)} −${formatNumber(data.filesRemoved ?? 0)}`
                    : undefined
                }
              />
            )}
          </div>
        </SidebarSection>

        <SidebarSection title="Contributors">
          {data.contributors.length === 0 ? (
            <p className="text-sm text-muted">No commits recorded this month.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.contributors.map((c, i) => (
                <ContributorPill key={c.login ?? c.name ?? `anon-${i}`} c={c} />
              ))}
            </div>
          )}
        </SidebarSection>

        {data.reviewers && data.reviewers.length > 0 && (
          <SidebarSection title="Reviewers">
            <div className="flex flex-col gap-1.5">
              {data.reviewers.map((r) => (
                <ReviewerPill key={r.login} r={r} />
              ))}
            </div>
          </SidebarSection>
        )}

        {kindEntries.length > 0 && (
          <SidebarSection title="New declarations by kind">
            <div className="flex flex-col gap-1">
              {kindEntries.map(([kind, count]) => (
                <div key={kind} className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">{KIND_LABELS[kind] ?? kind}</span>
                  <span className="font-semibold">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </SidebarSection>
        )}

        {topSubfolders.length > 0 && (
          <SidebarSection title="Most active areas">
            <div className="flex flex-col gap-1">
              {topSubfolders.map((s) => (
                <div key={s.path} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-mono text-foreground/80" title={s.path}>
                    {s.path}
                  </span>
                  <span className="shrink-0 text-muted">{formatNumber(s.linesChanged)}</span>
                </div>
              ))}
            </div>
          </SidebarSection>
        )}

        {hasCitation && (
          <SidebarSection title="Cite this report">
            <div className="rounded-xl border border-border bg-surface-secondary/40 p-3">
              <p className="text-xs text-foreground/90">
                Archived on Zenodo with a permanent DOI for citation.
              </p>
              <a
                href={data.zenodoUrl ?? `https://doi.org/${data.zenodoDoi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block break-all font-mono text-xs text-accent hover:underline underline-offset-2"
              >
                {data.zenodoDoi ? `doi.org/${data.zenodoDoi}` : data.zenodoUrl}
              </a>
            </div>
          </SidebarSection>
        )}

        <div className="flex flex-col gap-1 text-xs text-muted">
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
      </aside>
    </div>
  );
}
