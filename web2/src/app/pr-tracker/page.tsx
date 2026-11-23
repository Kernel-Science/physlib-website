import type { Metadata } from "next";
import { PRTrackerClient } from "./pr-tracker-client";
import { GithubSummary } from "./github-summary";
import { getPublicPulls, getReviewReport } from "./tracker-data";

export const metadata: Metadata = {
  title: "Pull Request Queue | Physlib",
  description:
    "Triage open pull requests for Physlib, categorized by what action is needed.",
};

export default async function PRTrackerPage() {
  const report = await getReviewReport();
  const pulls = report ? { prs: report.openPRs, complete: true } : await getPublicPulls();
  const queues = report && {
    unreviewed: report.unreviewedPRs.map((pr) => pr.number),
    awaiting: report.awaitingAuthorPRs.map((pr) => pr.number),
  };

  return (
    <div className="page-frame-tracker">
      <h1 className="page-title-tracker">
        Pull Request Queue
      </h1>
      <p className="page-intro-tracker mb-8">
        PRs are categorised by what action is needed.{" "}
        <a
          href="https://github.com/leanprover-community/physlib/pulls"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          View all on GitHub ↗
        </a>
      </p>
      {pulls ? (
        <PRTrackerClient key={report ? "report" : "github"} {...pulls} queues={queues ?? undefined} />
      ) : (
        <p className="py-12 text-center text-danger">
          The open pull request list is unavailable. View all on GitHub or try again later.
        </p>
      )}
      {report && <GithubSummary report={report} />}
    </div>
  );
}
