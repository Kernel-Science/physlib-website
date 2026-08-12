import type { Metadata } from "next";
import { getMonthlyUpdates, type MonthlyContributor } from "@/lib/yaml";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Monthly Updates | Physlib",
  description:
    "Auto-generated monthly reports of new definitions, theorems, and lemmas added to Physlib.",
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function ContributorPill({ c }: { c: MonthlyContributor }) {
  const label = c.login ?? c.name ?? "unknown";
  const inner = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-secondary/60 px-2 py-0.5 text-xs text-foreground/80 hover:bg-surface-secondary transition-colors">
      {c.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.avatar_url}
          alt=""
          width={16}
          height={16}
          className="size-4 rounded-full"
        />
      ) : null}
      {label}
    </span>
  );
  if (c.html_url) {
    return (
      <a
        href={c.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

export default async function MonthlyUpdatesPage() {
  const updates = await getMonthlyUpdates();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">Monthly Updates</h1>
      <p className="text-muted mb-8 leading-relaxed">
        A monthly changelog automatically generated on the 1st of each month
        from{" "}
        <a
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          leanprover-community/physlib
        </a>
        . Each row links to a PDF report, formatted as a short scientific
        paper, listing every new definition, theorem, and lemma added during
        that month along with its docstring and code snippet.
      </p>

      {updates.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          No monthly updates have been generated yet. The first report will
          appear on the 1st of the coming month.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary">
                <th className="px-4 py-3 text-left font-semibold border-b border-border w-32">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold border-b border-border">
                  Contributors
                </th>
                <th className="px-4 py-3 text-right font-semibold border-b border-border w-36">
                  Lines Changed
                </th>
                <th className="px-4 py-3 text-left font-semibold border-b border-border w-24">
                  Link
                </th>
              </tr>
            </thead>
            <tbody>
              {updates.map((u) => (
                <tr
                  key={u.slug}
                  className="border-b border-border last:border-0 hover:bg-surface-secondary/40 transition-colors"
                >
                  <td className="px-4 py-3 align-top font-medium whitespace-nowrap">
                    {u.label}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {u.contributors.length === 0 ? (
                      <span className="text-muted text-xs">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {u.contributors.map((c, i) => (
                          <ContributorPill
                            // Index, not Math.random(): a fresh random key
                            // every render forces React to discard and rebuild
                            // the element each time.
                            key={c.login ?? c.name ?? `anon-${i}`}
                            c={c}
                          />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-right font-mono text-xs">
                    <div>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{formatNumber(u.totalAdditions)}
                      </span>{" "}
                      <span className="text-rose-600 dark:text-rose-400">
                        −{formatNumber(u.totalDeletions)}
                      </span>
                    </div>
                    <div className="text-muted text-[10px] mt-0.5">
                      {formatNumber(u.linesChanged)} total
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {/* The generator sets pdfUrl only once a PDF exists at
                        that path. Guessing the path when it's absent is how a
                        report with no PDF still gets a download link that
                        404s. */}
                    {u.pdfUrl ? (
                      <a
                        href={u.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline underline-offset-2 text-sm"
                      >
                        PDF ↓
                      </a>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
