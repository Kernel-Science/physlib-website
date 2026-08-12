import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contributing via GitHub | Physlib",
  description:
    "A step-by-step guide to contributing to Physlib via GitHub, following our best practice guidlines",
};

export default function GhGuidePage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">

      <p className="label-mono text-muted mb-5">Community</p>
      <h1
        className="text-4xl font-medium text-foreground mb-4 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        Contributing via GitHub
      </h1>
      <p
        className="text-lg max-w-2xl mb-12 leading-snug"
        style={{ letterSpacing: "-0.01em", lineHeight: 1.4, color: "color-mix(in srgb, var(--foreground) 80%, var(--accent))" }}
      >
        A step-by-step guide to contributing to Physlib via GitHub, following our best practice guidlines
      </p>

      {/* Step 1 —  Deciding on a Problem to Work On */}
      <section className="mb-12">
        <h2
          className="text-2xl font-medium text-foreground mb-4"
          style={{ letterSpacing: "-0.035em" }}
        >
          1. Deciding on a Problem to Work On
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="default">
            <Card.Header>
              <Card.Title>Creating a GitHub issue</Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90">
              <p className="mb-4 leading-relaxed" style={{ color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
                Before starting any work, you can open an issue on the Physlib repository to
                describe the problem you are encountering or the feature you want to
                add. This makes maintainers aware of the work you plan on doing and helps with
                tracking the project. 
              </p>
              <ul className="space-y-2 ml-4">
                {issueChecklist.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-accent flex-shrink-0">—</span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <a
                  href={`${site.github}/issues/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded px-4 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
                >
                  Open an Issue ↗
                </a>
              </div>
            </Card.Content>
          </Card>

          <Card variant="default">
            <Card.Header>
              <Card.Title>Asking the community</Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90">
              <p className="mb-4 leading-relaxed" style={{ color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
              The Physlib community is full of members who can point you in the right direction if you want to discuss an idea before opening an issue.
              There is a Physlib channel on the Leanprover Zulip where you can post any questions you have. 
                </p>
                <div className="mt-4">
                <a
                  href="https://leanprover.zulipchat.com/#narrow/channel/479953-Physlib"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded px-4 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
                >
                  Visit the Physlib Zulip ↗
                </a>
              </div>
            </Card.Content>
          </Card>
        </div>
      </section>

      {/* Step 2 — Work on it */}
      <section className="mb-12">
        <h2
          className="text-2xl font-medium text-foreground mb-4"
          style={{ letterSpacing: "-0.035em" }}
        >
          2. Work on the Problem
        </h2>
        <p
          className="text-sm mb-4 leading-relaxed"
          style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}
        >
          Before writing any Lean, please read the{" "}
          <a href="/getting-started" className="text-accent hover:underline underline-offset-2">
            Getting Started
          </a>{" "}
          guide for how to install Physlib and write results in Lean according to our code quality standards.
        </p>
        <p
          className="text-sm mt-3 leading-relaxed"
          style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}
        >
          Always create a new branch from the latest <code className="font-mono text-xs">master</code>{" "} branch before starting work.
          This ensures that your changes are based on the most recent version of the codebase and reduces the likelihood of merge conflicts.
          We recommend you use a git GUI if you are not familiar with the command line.
          
        </p>
      </section>

      {/* Step 3 — Pull Request */}
      <section className="mb-12">
        <h2
          className="text-2xl font-medium text-foreground mb-4"
          style={{ letterSpacing: "-0.035em" }}
        >
          3. Make a Pull Request
        </h2>
        <p className="text-sm mb-8 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          Small pull-requests are better than large ones — even if it&apos;s just a single result.
          Follow the PR template provided by GitHub when opening your PR.
        </p>

        <ol className="list-decimal ml-5 space-y-2 text-sm text-foreground/90 mb-4">
          <li>Fork the Physlib repository to your GitHub account.</li>
          <li>Clone your forked repository to your local machine.</li>
          <li>
            Add the original repo as <code className="font-mono text-xs">upstream</code>:{" "}
            <code className="font-mono text-xs">git remote add upstream https://github.com/leanprover-community/physlib.git</code>
          </li>
          <li>Make your changes on a new branch (<code className="font-mono text-xs">git switch -c my-branch</code>).</li>
          <li>Push your branch to your fork.</li>
          <li>
            Open a pull request from your forked version to the main Physlib repository.
          </li>
        </ol>
        <p
          className="text-sm leading-relaxed"
          style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}
        >
          GitHub usually shows a banner offering to open the PR for you right
          after you push. If you don&apos;t see it, go to{" "}
          <a
            href="https://github.com/leanprover-community/physlib/compare"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            the compare page
          </a>{" "}
          and click &quot;compare across forks&quot;. Select your fork in the
          &quot;head repository&quot; dropdown, and the branch you want to
          merge in the &quot;compare&quot; dropdown.
        </p>

        <div className="mt-8">
          <h3
            className="text-lg font-medium text-foreground mb-3"
            style={{ letterSpacing: "-0.03em" }}
          >
            Adding Labels
          </h3>
          <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
            When opening a pull request, labels help the mainainers manage the review process. Please add comments so the bot can add labels for you. eg. commenting &quot;awaiting-author&quot; will add the{" "}
            <LabelPill name="awaiting-author" />{" "}
            label. You can view the full list of labels{" "}
            <a
              href="https://github.com/leanprover-community/physlib/labels"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline underline-offset-2"
            >
              here
            </a>.          </p>
        </div>

        <div className="mt-8">
          <h3
            className="text-lg font-medium text-foreground mb-3"
            style={{ letterSpacing: "-0.03em" }}
          >
            Lifecycle of a PR
          </h3>
          <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
            Once a reviewer looks at your PR, they will usually leave comments and
            add the <LabelPill name="awaiting-author" /> label. Once you have responded to the reviewer&apos;s comments and made any required changes,
            comment <code className="font-mono text-xs">-awaiting-author </code> to remove the label and let them know they should re-review the PR. Once
            they&apos;re happy, they&apos;ll mark it{" "}
            <LabelPill name="reviewer-approved" />. Then a maintainer can look at the PR and add the{" "}
            <LabelPill name="ready-to-merge" /> label to add your change to the merge queue, where the final quality checks are run.
          </p>
        </div>

        <div className="mt-8">
          <h3
            className="text-lg font-medium text-foreground mb-3"
            style={{ letterSpacing: "-0.03em" }}
          >
            Other Common Labels
          </h3>
          <ul className="space-y-3 text-sm" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
            <li>
              <LabelPill name="WIP" /> — the PR still needs foundational work
              (e.g. it contains <code className="font-mono text-xs">sorry</code>) before it&apos;s ready for review. Use it to
              signal you&apos;re working on something you expect to finish soon.
            </li>
            <li>
              <LabelPill name="help-wanted" /> — directly soliciting contributions
              on an issue or PR.
            </li>
            <li>
              <LabelPill name="easy" /> — a trivial change (a single lemma, a typo
              fix, a diff under ~25 lines, no new definitions) that maintainers
              prioritise reviewing first to keep the queue moving. If you&apos;re
              unsure whether your PR qualifies, don&apos;t add it.
            </li>
            <li>
              <LabelPill name="blocked-by-PR" /> /{" "}
              <LabelPill name="blocked-by-mathlib-PR" /> — this PR depends on
              another PR being merged first. Include the blocking PR&apos;s number
              in the title or a comment so reviewers know what to check first.
            </li>
            <li>
              <LabelPill name="merge-conflict" /> — your branch has diverged from{" "}
              <code className="font-mono text-xs">master </code> in a way Git
              can&apos;t resolve automatically. See GitHub&apos;s{" "}
              <a
                href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-on-github"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline underline-offset-2"
              >
                guide to resolving merge conflicts
              </a>{" "}
              for how to fix it.
            </li>
          </ul>
        </div>
      </section>

      <section className="mb-12">
        <h2
          className="text-2xl font-medium text-foreground mb-4"
          style={{ letterSpacing: "-0.035em" }}
        >
          4. Managing the PR
        </h2>
        <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          After opening a PR, the maintainers will review the changes and provide feedback. Feel free to begin work on a separate PR in the meantime but be prepared to make changes to this one if required.
        </p>
        <p className="text-sm mt-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          If you want a reviewer to be able to push fixes directly to your branch, you can grant them
          collaborator access via your fork&apos;s Settings → Collaborators. Once they accept, they
          can push to your PR branch directly.
        </p>
        <p className="text-sm mt-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          If you get stuck at any point, the{" "}
          <a
            href="https://leanprover.zulipchat.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            Lean Zulip
          </a>{" "}
          is full of people who are happy to give advice.
        </p>
      </section>

      <section className="mb-12">
        <h2
          className="text-2xl font-medium text-foreground mb-4"
          style={{ letterSpacing: "-0.035em" }}
        >
          5. Merging the PR
        </h2>
        <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
         Once the reviewer is happy with the changes, they will merge the PR into the main branch. Physlib uses a{" "}
            <a
              href="https://github.com/leanprover-community/physlib/queue/main"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline underline-offset-2"
            >
              merge queue
            </a>{" "}
            to ensure that consecutive changes do not produce unexpected errors. This may result in your PR being rejected with errors you have not seen before.
        </p>
      </section>

      {/* Additional Guidance */}
      <section className="mb-12">
        <h2
          className="text-2xl font-medium text-foreground mb-4"
          style={{ letterSpacing: "-0.035em" }}
        >
          Additional Guidance
        </h2>
        <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          Please use your real name in your GitHub account settings and commit author. Physlib uses
          GitHub account names in its automated documentation generation, so using your real name
          makes it easier for people to recognise your work.
        </p>
        <p className="text-sm mt-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          If you are contributing to PhyslibAlpha, which sits downstream of Physlib,
          Lean code quality guidelines are less strict. However, please still follow the GitHub contribution guide.
        </p>
      </section>

    </div>
  );
}

const issueChecklist = [
  "A clear title summarising the problem or feature.",
  "Explain the motivation for the feature.",
  "Any relevant links.",
  "A summary of the incorrect code (For bugs).",
];

// Actual colors from github.com/leanprover-community/physlib/labels, so
// these read as the real labels rather than approximations.
const labelColors: Record<string, string> = {
  "awaiting-author": "f96e8f",
  "reviewer-approved": "71d9a5",
  "ready-to-merge": "97f144",
  WIP: "dfeca7",
  "help-wanted": "008672",
  easy: "6be25e",
  "blocked-by-PR": "0c7b31",
  "blocked-by-mathlib-PR": "c4c38e",
  "merge-conflict": "4077a0",
};

function contrastColor(hex: string) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? "#000" : "#fff";
}

function LabelPill({ name }: { name: string }) {
  const color = labelColors[name];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: `#${color}`, color: contrastColor(color) }}
    >
      {name}
    </span>
  );
}
