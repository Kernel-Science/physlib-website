import type { Growth, GrowthMonth } from "@/lib/yaml";

/*
 * Small-multiple growth charts for the sponsor page, drawn as plain SVG on the
 * server: four tiles sharing one time axis, each with the current value, the
 * value a year earlier, and a link to where the number can be checked.
 */

const W = 300;
const H = 88;
const PAD_TOP = 6;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

const fmt = (n: number) => n.toLocaleString("en-US");

type Tile = {
  label: string;
  /** The value plotted for each month. */
  value: (m: GrowthMonth) => number;
  /** The headline number, when it is not the last plotted value. */
  headline?: (series: GrowthMonth[]) => number;
  kind: "line" | "bars";
  sourceUrl: string;
  sourceLabel: string;
  note?: string;
};

function x(i: number, n: number) {
  return n <= 1 ? 0 : (i / (n - 1)) * W;
}

/** Height, in viewBox units, of the last point of a line chart. */
function endY(values: number[]) {
  const max = Math.max(...values, 1);
  return PAD_TOP + (1 - values[values.length - 1] / max) * (H - PAD_TOP);
}

function LineChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const y = (v: number) => PAD_TOP + (1 - v / max) * (H - PAD_TOP);
  const points = values.map(
    (v, i) => `${x(i, values.length).toFixed(1)},${y(v).toFixed(1)}`,
  );
  const line = `M${points.join("L")}`;
  const area = `${line}L${W},${H}L0,${H}Z`;
  return (
    <>
      <path d={area} fill="currentColor" opacity={0.1} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
}

function BarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const slot = W / values.length;
  return (
    <>
      {values.map((v, i) => {
        const h = (v / max) * (H - PAD_TOP);
        // The current month is still in progress, so it is drawn lighter.
        const partial = i === values.length - 1;
        return (
          <rect
            key={i}
            x={i * slot + slot * 0.15}
            y={H - h}
            width={slot * 0.7}
            height={h}
            fill="currentColor"
            opacity={partial ? 0.35 : 0.85}
          />
        );
      })}
    </>
  );
}

function GrowthTile({ tile, series }: { tile: Tile; series: GrowthMonth[] }) {
  const values = series.map(tile.value);
  const last = series.at(-1)!;
  const yearAgo = series[Math.max(0, series.length - 13)];
  const now = tile.headline ? tile.headline(series) : values.at(-1)!;
  const before = tile.headline
    ? tile.headline(series.slice(0, series.length - 12))
    : tile.value(yearAgo);
  // Year boundaries, as positions along the shared axis.
  const years = series
    .map((m, i) => ({ m, i }))
    .filter(({ m }) => m.month.endsWith("-01"))
    .map(({ m, i }) => ({
      label: m.month.slice(0, 4),
      pct:
        tile.kind === "bars"
          ? ((i + 0.5) / series.length) * 100
          : (x(i, series.length) / W) * 100,
    }));

  return (
    <figure className="m-0 flex flex-col rounded-xl border border-border bg-surface p-4">
      <figcaption className="label-mono text-muted">{tile.label}</figcaption>
      <p
        className="mt-2 text-3xl font-medium leading-none tabular-nums text-foreground"
        style={{ letterSpacing: "-0.04em" }}
      >
        {fmt(now)}
      </p>
      <p className="mt-1 text-xs text-muted">
        from {fmt(before)} in {monthLabel(yearAgo.month)}
      </p>

      <div className="mt-4 text-accent">
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-20 w-full overflow-visible"
            role="img"
            aria-label={`${tile.label}: ${fmt(values[0])} in ${monthLabel(series[0].month)}, ${fmt(values.at(-1)!)} in ${monthLabel(last.month)}`}
          >
            {years.map((yr) => (
              <line
                key={yr.label}
                x1={(yr.pct / 100) * W}
                x2={(yr.pct / 100) * W}
                y1={0}
                y2={H}
                stroke="var(--border)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <line
              x1={0}
              x2={W}
              y1={H}
              y2={H}
              stroke="var(--border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            {tile.kind === "line" ? (
              <LineChart values={values} />
            ) : (
              <BarChart values={values} />
            )}
          </svg>
          {tile.kind === "line" && (
            // Drawn in HTML so it stays round: the SVG is stretched to the tile's width.
            <span
              aria-hidden="true"
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-4 ring-accent/20"
              style={{ left: "100%", top: `${(endY(values) / H) * 100}%` }}
            />
          )}
        </div>
        <div
          className="relative mt-1 h-4 font-mono text-[10px] text-muted"
          aria-hidden="true"
        >
          {years.map((yr) => (
            <span
              key={yr.label}
              className="absolute -translate-x-1/2"
              style={{ left: `${yr.pct}%` }}
            >
              {yr.label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted">{tile.note}</span>
        <a
          href={tile.sourceUrl}
          className="shrink-0 text-accent hover:underline underline-offset-2"
        >
          {tile.sourceLabel}
        </a>
      </div>
    </figure>
  );
}

export function GrowthCharts({ growth }: { growth: Growth }) {
  const { series, repo, headSha } = growth;
  const base = `https://github.com/${repo}`;
  const tiles: Tile[] = [
    {
      label: "Lines of reviewed Lean",
      value: (m) => m.lines,
      kind: "line",
      sourceUrl: `${base}/tree/${headSha}`,
      sourceLabel: "Source code",
      note: "The step in March 2026 is QuantumInfo joining.",
    },
    {
      label: "Contributors",
      value: (m) => m.contributors,
      kind: "line",
      sourceUrl: `${base}/graphs/contributors`,
      sourceLabel: "GitHub",
      note: "People with an accepted pull request.",
    },
    {
      label: "Pull requests proposed",
      value: (m) => m.pullRequests,
      headline: (s) => s.at(-1)?.pullRequestsTotal ?? 0,
      kind: "bars",
      sourceUrl: `${base}/pulls?q=is%3Apr`,
      sourceLabel: "GitHub",
      note: "Bars show each month; this month so far is lighter.",
    },
    {
      label: "GitHub stars",
      value: (m) => m.stars,
      kind: "line",
      sourceUrl: "https://star-history.com/#leanprover-community/physlib&Date",
      sourceLabel: "Star history",
    },
  ];

  return (
    <div className="not-prose my-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {tiles.map((tile) => (
          <GrowthTile key={tile.label} tile={tile} series={series} />
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Monthly from {monthLabel(series[0].month)} to{" "}
        {monthLabel(series.at(-1)!.month)}. Code is counted in the reviewed
        libraries, {growth.libraries.join(" and ")}, at the last commit of each
        month; PhyslibAlpha is not included. Generated from Physlib&apos;s git
        history and the GitHub API by{" "}
        <a
          href="https://github.com/Kernel-Science/physlib-website/blob/main/web2/scripts/generate-growth.js"
          className="text-accent hover:underline underline-offset-2"
        >
          this script
        </a>
        , which records the commit each month was measured at.
      </p>
    </div>
  );
}
