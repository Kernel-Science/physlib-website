import type { Metadata } from "next";
import { PRTrackerClient } from "./pr-tracker-client";
import { GithubSummary } from "./github-summary";

export const metadata: Metadata = {
  title: "PR Triage | Physlib",
  description:
    "Triage open pull requests for Physlib, categorized by what action is needed.",
};

export default function PRTrackerPage() {
  return (
    <div className="page-frame-tracker">
      <h1 className="page-title-tracker">
        Pull Request Triage
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
      <PRTrackerClient />
      <GithubSummary />
    </div>
  );
}
