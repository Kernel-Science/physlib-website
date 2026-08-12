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
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">
        Pull Request Triage
      </h1>
      <p className="text-muted mb-8">
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
