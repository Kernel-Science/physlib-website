import { site } from "@/lib/site";

type ReviewerEntry = [string, number];
type PRLink = { number: number; title: string; url: string };
type UnreviewedPR = PRLink & { labels: string[]; linesChanged: number };
type RecentPR = PRLink & { author: string };

type Report = {
  busyThreshold: number;
  busy: ReviewerEntry[];
  moderate: ReviewerEntry[];
  quiet: ReviewerEntry[];
  unreviewedPRs: UnreviewedPR[];
  mergedRecently: RecentPR[];
  openedRecently: RecentPR[];
  mergedLast7d: RecentPR[];
  openedLast7d: RecentPR[];
  mergedLast30d: RecentPR[];
  openedLast30d: RecentPR[];
};

async function getReport(): Promise<Report | null> {
  try {
    const res = await fetch(site.reportApi, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Report;
  } catch {
    return null;
  }
}

export async function GithubSummary() {
  const report = await getReport();
  if (!report) return null;

  const groups: { label: string; dot: string; entries: ReviewerEntry[] }[] = [
    { label: `Busy (≥${report.busyThreshold})`, dot: "bg-danger", entries: report.busy },
    { label: "Moderate", dot: "bg-warning", entries: report.moderate },
    { label: "Quiet", dot: "bg-accent", entries: report.quiet },
  ];

  const windows = [
    { label: "Last 24h", opened: report.openedRecently.length, merged: report.mergedRecently.length },
    { label: "Last 7 days", opened: report.openedLast7d.length, merged: report.mergedLast7d.length },
    { label: "Last 30 days", opened: report.openedLast30d.length, merged: report.mergedLast30d.length },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-3">Current reviewer load</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
        <Stat label="In need of reviewer" count={report.unreviewedPRs.length} color="border-l-danger" />

        {groups.map((g) => (
          <div key={g.label} className="rounded-lg border border-border bg-surface px-4 py-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted">
              <span className={`size-2 rounded-full ${g.dot}`} />
              {g.label} ({g.entries.length})
            </div>
            {g.entries.length === 0 ? (
              <p className="text-xs text-muted/60">none</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {g.entries.map(([login, count]) => (
                  <a
                    key={login}
                    href={`https://github.com/${login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded-full text-xs bg-surface-secondary border border-border hover:bg-foreground/5"
                  >
                    {login}
                    {count > 0 && <span className="text-muted"> ({count})</span>}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary text-muted text-xs">
              <th className="px-3 py-2 text-left font-medium">Time frame</th>
              <th className="px-3 py-2 text-right font-medium">PRs Opened</th>
              <th className="px-3 py-2 text-right font-medium">PRs Merged</th>
              <th className="px-3 py-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {windows.map((w) => (
              <tr key={w.label} className="border-t border-border">
                <td className="px-3 py-2">{w.label}</td>
                <td className="px-3 py-2 text-right">{w.opened}</td>
                <td className="px-3 py-2 text-right">{w.merged}</td>
                <td className="px-3 py-2 text-right font-medium">
                  <NetTrend opened={w.opened} merged={w.merged} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Matches the stat tiles in pr-tracker-client.tsx (Needs Review/Awaiting
// Author/Draft/Total Open) so this reads as one consistent row of stats
// rather than a visually distinct component.
function Stat({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface px-4 py-4 border-l-4 ${color} text-center`}>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}

// Approximates whether the open-PR backlog is growing or shrinking over a
// window, using data already in the report (opened vs merged counts) rather
// than tracking exact historical snapshots of the unreviewed-PR count.
function NetTrend({ opened, merged }: { opened: number; merged: number }) {
  const net = opened - merged;
  const isFlat = net === 0;
  const isGrowing = net > 0;
  const color = isFlat ? "text-muted" : isGrowing ? "text-danger" : "text-success";
  const arrow = isFlat ? "→" : isGrowing ? "▲" : "▼";

  return (
    <span className={color}>
      {arrow} {isFlat ? "0" : `${isGrowing ? "+" : ""}${net}`}
    </span>
  );
}
