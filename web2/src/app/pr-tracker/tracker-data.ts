import { site } from "@/lib/site";

export type PullRequest = {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  created_at: string;
  user: { login: string } | null;
  labels: { name: string; color: string }[];
};

type NumberedPR = { number: number };

export type ReviewReport = {
  openPRs: PullRequest[];
  unreviewedPRs: NumberedPR[];
  awaitingAuthorPRs: NumberedPR[];
  busyThreshold: number;
  busy: [string, number][];
  moderate: [string, number][];
  quiet: [string, number][];
  mergedRecently: NumberedPR[];
  openedRecently: NumberedPR[];
  mergedLast7d: NumberedPR[];
  openedLast7d: NumberedPR[];
  mergedLast30d: NumberedPR[];
  openedLast30d: NumberedPR[];
};

function hasNumber(pr: NumberedPR | null): boolean {
  return !!pr && Number.isSafeInteger(pr.number) && pr.number > 0;
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Validate the fields rendered by the table and omit the rest of GitHub's REST payload.
function tableRows(prs: PullRequest[]): PullRequest[] {
  return prs.map((pr) => {
    if (!hasNumber(pr) || !hasText(pr.title) || pr.html_url !== `${site.github}/pull/${pr.number}` ||
        typeof pr.draft !== "boolean" || !hasText(pr.created_at) || !Number.isFinite(Date.parse(pr.created_at))) {
      throw new Error("Invalid pull request in tracker response");
    }
    if ((pr.user !== null && !hasText(pr.user?.login)) || !Array.isArray(pr.labels) ||
        !pr.labels.every((label) => label && hasText(label.name) &&
          typeof label.color === "string" && /^[0-9a-f]{6}$/i.test(label.color))) {
      throw new Error("Invalid author or labels in tracker response");
    }
    const { number, title, html_url, draft, created_at, user, labels } = pr;
    return {
      number, title, html_url, draft, created_at,
      user: user && { login: user.login },
      labels: labels.map(({ name, color }) => ({ name, color })),
    };
  });
}

export async function getReviewReport(): Promise<ReviewReport | null> {
  try {
    const response = await fetch(site.reportApi, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const report: ReviewReport = await response.json();
    const activity = [
      report.unreviewedPRs, report.awaitingAuthorPRs, report.mergedRecently, report.openedRecently,
      report.mergedLast7d, report.openedLast7d, report.mergedLast30d, report.openedLast30d,
    ];
    const workloads = [report.busy, report.moderate, report.quiet];
    if (!Number.isFinite(report.busyThreshold) ||
        !activity.every((list) => Array.isArray(list) && list.every(hasNumber)) ||
        !workloads.every((group) => Array.isArray(group) && group.every(
          (entry) => Array.isArray(entry) && hasText(entry[0]) &&
            Number.isSafeInteger(entry[1]) && entry[1] >= 0,
        ))) return null;
    return { ...report, openPRs: tableRows(report.openPRs) };
  } catch {
    return null;
  }
}

export async function getPublicPulls(): Promise<{ prs: PullRequest[]; complete: boolean } | null> {
  const rows = new Map<number, PullRequest>();
  // Follow GitHub's pagination while bounding the requests made by a single page view.
  for (let page = 1; page <= 10; page++) {
    try {
      const url = new URL("https://api.github.com/repos/leanprover-community/physlib/pulls");
      url.search = new URLSearchParams({ state: "open", per_page: "50", page: String(page) }).toString();
      const response = await fetch(url, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) break;
      for (const pr of tableRows(await response.json())) rows.set(pr.number, pr);
      if (!response.headers.get("link")?.includes('rel="next"')) {
        return { prs: [...rows.values()], complete: true };
      }
    } catch {
      break;
    }
  }
  return rows.size ? { prs: [...rows.values()], complete: false } : null;
}
