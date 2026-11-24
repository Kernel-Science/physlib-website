import { Card } from "@heroui/react";
import { labelTone, tagClass } from "@/lib/label-tone";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/button-link";
import { CodeBlock } from "@/components/code-block";
import { PageHeader } from "@/components/page-header";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "GitHub Guide",
  description:
    "Fork Physlib, submit your changes, and respond to review on GitHub.",
};

export default function GhGuidePage() {
  return (
    <div className="page-frame-editorial">

      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        GitHub Guide
      </h1>
      <p className="page-intro-editorial max-w-2xl mb-10">
        Use this guide to create a branch, open a pull request, and work through review on GitHub.
      </p>

      <section className="mb-12">
        <PageHeader id="deciding-a-problem" number={1} title="Choose a Task" />
        <p className="text-sm mb-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          Start with{" "}
          <Link href={site.tasks} className="text-accent hover:underline underline-offset-2">Find a Task</Link>
          {" "}to see what is already open.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="default">
            <Card.Header><Card.Title>Creating a GitHub Issue</Card.Title></Card.Header>
            <Card.Content className="space-y-3 text-sm leading-relaxed text-foreground/80">
              <p>Open an issue to describe a problem or feature and let maintainers know what you plan to work on.</p>
              <ul className="ml-5 list-disc space-y-1">
                {issueChecklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <ButtonLink size="sm" href={`${site.github}/issues/new`}>Open an Issue ↗</ButtonLink>
            </Card.Content>
          </Card>
          <Card variant="default">
            <Card.Header><Card.Title>Asking the Community</Card.Title></Card.Header>
            <Card.Content className="space-y-3 text-sm leading-relaxed text-foreground/80">
              <p>Ask in the Physlib Zulip channel if you want to discuss an idea or get help choosing a task before opening an issue.</p>
              <ButtonLink size="sm" href={site.zulip}>Visit the Physlib Zulip ↗</ButtonLink>
            </Card.Content>
          </Card>
        </div>
      </section>

      {/* Step 2 — Work on it */}
      <section className="mb-12">
        <PageHeader id="work-on-the-problem" number={2} title="Create a Branch" />
        <p
          className="text-sm mb-4 leading-relaxed"
          style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}
        >
          Follow the “I want to contribute” instructions in{" "}
          <Link href="/getting-started#installing" className="text-accent hover:underline underline-offset-2">
            Getting Started
          </Link>{" "}
          to fork Physlib and clone it. In that checkout, <code>origin</code> points to your fork
          and <code>upstream</code> points to <code>leanprover-community/physlib</code>.
          Create a branch for your changes from the current upstream <code>master</code>.
        </p>
        <CodeBlock language="bash" code={`git fetch upstream
git switch --no-track -c my-change upstream/master`} />
      </section>

      {/* Step 3 — Pull Request */}
      <section className="mb-12">
        <PageHeader id="make-a-pull-request" number={3} title="Open a Pull Request" />
        <p className="text-sm mb-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          Keep each pull request focused on one change. After editing, building, and{" "}
          <Link href="/getting-started#linting" className="text-accent hover:underline underline-offset-2">linting</Link>, run
          these commands from your checkout. Replace <code>path/to/file</code> with your
          changed file paths and write a commit message describing your change.
        </p>
        <CodeBlock language="bash" code={`git status --short
git add -- path/to/file
git diff --cached
git commit -m "Describe your change"
git push -u origin my-change`} />
        <p
          className="text-sm mt-4 leading-relaxed"
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
          and click &quot;compare across forks&quot;. Set the base repository to{" "}
          <code>leanprover-community/physlib</code> and the base branch to <code>master</code>.
          Select your fork as the head repository and <code>my-change</code> as the compare
          branch. Describe your change and how you checked it in your own words.
        </p>

        <div className="mt-8">
          <h3
            id="adding-labels"
            className="text-lg font-medium text-foreground mb-3 scroll-mt-24"
            style={{ letterSpacing: "-0.03em" }}
          >
            Adding Labels
          </h3>
          <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
            If your PR needs a subject label, comment with its name on a line by itself.
            For example, <code>t-relativity</code> marks a contribution to relativity. See the{" "}
            <a
              href="https://github.com/leanprover-community/physlib/labels"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline underline-offset-2"
            >
              available labels
            </a>.
          </p>
        </div>

        <div className="mt-8">
          <h3
            id="lifecycle-of-a-pr"
            className="text-lg font-medium text-foreground mb-3 scroll-mt-24"
            style={{ letterSpacing: "-0.03em" }}
          >
            Lifecycle of a PR
          </h3>
          <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
            A reviewer can add <LabelPill name="awaiting-author" /> when you need to respond.
            After addressing the feedback, comment <code className="font-mono text-xs">-awaiting-author</code>{" "}
            on a line by itself to return your PR to the review queue. Once
            they&apos;re happy, they&apos;ll mark it{" "}
            <LabelPill name="reviewer-approved" />. Then a maintainer can look at the PR and add the{" "}
            <LabelPill name="ready-to-merge" /> label to add your change to the merge queue, where the final quality checks are run.
          </p>
        </div>

        <div className="mt-8">
          <h3
            id="other-common-labels"
            className="text-lg font-medium text-foreground mb-3 scroll-mt-24"
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
              prioritize reviewing first to keep the queue moving. If you&apos;re
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
              <code className="font-mono text-xs">master</code> in a way Git
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
        <PageHeader id="managing-the-pr" number={4} title="Managing the PR" />
        <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          After opening a PR, automated checks will run and a reviewer will provide feedback, following the{" "}
          <a
            href={`${site.github}/blob/master/docs/ReviewGuidelines.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            review guidelines
          </a>. The first review can take several days, and if you have never had a PR merged
          a reviewer may need to start the checks for you. Feel free to begin work on a separate
          PR in the meantime but be prepared to make changes to this one if required.
        </p>
        <p className="text-sm mt-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          If you want a reviewer to be able to push fixes directly to your branch, you can grant them
          collaborator access via your fork&apos;s Settings → Collaborators. Once they accept, they
          can push to your PR branch directly.
        </p>
        <p className="text-sm mt-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          If you get stuck at any point, the{" "}
          <a
            href={site.zulip}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            Physlib Zulip
          </a>{" "}
          is full of people who are happy to give advice.
        </p>
      </section>

      <section className="mb-12">
        <PageHeader id="merging-the-pr" number={5} title="Merging the PR" />
        <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          Approved changes merge into <code>master</code>. Physlib uses a{" "}
          <a
            href="https://github.com/leanprover-community/physlib/queue/master"
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
        <PageHeader id="additional-guidance" title="Additional Guidance" />
        <p className="text-sm mb-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          If you used AI to prepare a change, check the{" "}
          <Link href={site.aiResources + "#ai-guidelines"} className="text-accent hover:underline underline-offset-2">
            AI contribution guidelines
          </Link>
          {" "}before submitting it.
        </p>
        <p className="text-sm leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          Please use your real name in your GitHub account settings and commit author. Physlib uses
          GitHub account names in its automated documentation generation, so using your real name
          makes it easier for people to recognize your work.
        </p>
        <p className="text-sm mt-4 leading-relaxed" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
          If you are contributing to PhyslibAlpha, which sits downstream of Physlib,
          Lean code quality guidelines are less strict. However, please still follow this GitHub Guide.
        </p>
      </section>


    </div>
  );
}

const issueChecklist = [
  "A clear title summarizing the problem or feature.",
  "Explain the motivation for the feature.",
  "Any relevant links.",
  "A summary of the incorrect code (for bugs).",
];

function LabelPill({ name }: { name: string }) {
  return <span className={tagClass(labelTone(name))}>{name}</span>;
}
