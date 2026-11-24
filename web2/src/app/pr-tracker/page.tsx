import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { PRTrackerClient } from "./pr-tracker-client";
import { GithubSummary } from "./github-summary";
import { getPublicPulls, getReviewReport } from "./tracker-data";

export const metadata: Metadata = {
  title: "Pull Request Queue",
  description:
    "Triage open pull requests for Physlib, categorized by what action is needed.",
};

const linkClass = "text-accent hover:underline underline-offset-2";

export default async function PRTrackerPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string | string[]; q?: string | string[] }>;
}) {
  const [report, view] = await Promise.all([getReviewReport(), searchParams]);
  const pulls = report ? { prs: report.openPRs, complete: true } : await getPublicPulls();
  const queues = report && {
    unreviewed: report.unreviewedPRs.map((pr) => pr.number),
    awaiting: report.awaitingAuthorPRs.map((pr) => pr.number),
  };

  return (
    <div className="page-frame-tracker">
      <p className="label-mono text-muted mb-5">Contribute</p>
      <h1 className="page-title-tracker">
        Pull Request Queue
      </h1>
      <p className="page-intro-tracker mb-8">
        Open pull requests, grouped by what they are waiting for. To review one, comment{" "}
        <code className="rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-sm">claim</code> on it
        and follow the{" "}
        <a
          href={`${site.github}/blob/master/docs/ReviewGuidelines.md`}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          review guidelines ↗
        </a>
        .
      </p>
      {pulls ? (
        <PRTrackerClient
          key={report ? "report" : "github"}
          {...pulls}
          queues={queues ?? undefined}
          initialFilter={typeof view.show === "string" ? view.show : undefined}
          initialQuery={typeof view.q === "string" ? view.q : undefined}
        />
      ) : (
        <p className="py-12 text-center text-danger" role="status">
          The open pull request list is unavailable right now.{" "}
          <a
            href={`${site.github}/pulls`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            View all on GitHub ↗
          </a>{" "}
          or try again in a few minutes.
        </p>
      )}
      {report && <GithubSummary report={report} />}

    </div>
  );
}
