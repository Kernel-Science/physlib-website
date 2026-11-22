import type { MonthlyContributor, MonthlyReviewer } from "@/lib/yaml";
import { GitHubProfilePill } from "@/components/github-profile-pill";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function ContributorPill({ c }: { c: MonthlyContributor }) {
  const label = c.login ?? c.name ?? "unknown";
  return (
    <GitHubProfilePill label={label} avatarUrl={c.avatar_url} href={c.html_url}>
      <span className="text-muted font-mono text-[10px]">
        {formatNumber(c.linesChanged)}
      </span>
      {c.firstTime ? (
        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
          new
        </span>
      ) : null}
    </GitHubProfilePill>
  );
}

export function ReviewerPill({ r }: { r: MonthlyReviewer }) {
  const label = r.name ?? r.login;
  return (
    <GitHubProfilePill label={label} avatarUrl={r.avatar_url} href={r.html_url}>
      <span className="text-muted font-mono text-[10px]">
        {r.reviews} review{r.reviews === 1 ? "" : "s"}
      </span>
    </GitHubProfilePill>
  );
}
