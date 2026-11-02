import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { PageHeader } from "@/components/page-header";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "PhyslibAItools | Physlib",
  description:
    "PhyslibAItools is a companion project of AI-assisted tooling for Physlib.",
};

const physlibAiToolsRepo = "https://github.com/jstoobysmith/PhyslibAITools";
const textStyle = { letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" };

export default function PhyslibAiToolsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">
      <p className="label-mono text-muted mb-5">AI Tools</p>
      <h1
        className="text-4xl font-medium text-foreground mb-4 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        PhyslibAItools
      </h1>
      <p
        className="text-lg max-w-2xl mb-12 leading-snug"
        style={{ letterSpacing: "-0.01em", lineHeight: 1.4, color: "color-mix(in srgb, var(--foreground) 80%, var(--accent))" }}
      >
        A companion project of AI-assisted tooling for Physlib, maintained by{" "}
        <a
          href="https://github.com/jstoobysmith"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          jstoobysmith
        </a>{" "}
        in its own repository.
      </p>

      <section className="mb-12">
        <PageHeader id="what-it-does" title="What it does" />
        <p className="text-sm leading-relaxed" style={textStyle}>
          PhyslibAItools uses an AI agent of your choice to complete automated tasks on the Physlib codebase.
        </p>
      </section>

      <section className="mb-12">
        <PageHeader id="two-ways-to-run-it" title="Two ways to run it" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="default">
            <Card.Header>
              <Card.Title>Desktop app (GUI)</Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90">
              <p className="mb-4 leading-relaxed" style={textStyle}>
               Sign in to Claude Code and GitHub, then choose from a list of taks to get your agent working on. These include: Golf, Rename, DocFixer, APIMap (Atlas articles), ImportMinimizer, LintQI and TODO. Your agent will automatically make a PR for completed tasks.
              </p>
              <a
                href={`${physlibAiToolsRepo}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded px-4 text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
              >
                Download releases ↗
              </a>
            </Card.Content>
          </Card>

          <Card variant="default">
            <Card.Header>
              <Card.Title>
                <code className="font-mono text-sm">Command Line</code>
              </Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90">
              <p className="mb-4 leading-relaxed" style={textStyle}>
                A CLI which can perform documentation checking using a local LLM of your choice. 
              </p>
            </Card.Content>
          </Card>
        </div>
      </section>

      <section className="mb-12">
        <PageHeader id="requirements" title="Requirements" />
        <ul className="space-y-2 ml-4 text-sm text-foreground/90">
          <li className="flex gap-3">
            <span className="text-accent flex-shrink-0">—</span>
            A paid Claude plan, or an Anthropic API account
            with credits. The free tier can&apos;t run Claude Code.
          </li>
          <li className="flex gap-3">
            <span className="text-accent flex-shrink-0">—</span>
            A GitHub account, used to fork Physlib and open the PRs.
          </li>
        </ul>
        <p className="text-sm mt-4 leading-relaxed" style={textStyle}>
         See the{" "}
          <a href="/ai-guidelines" className="text-accent hover:underline underline-offset-2">
            AI Guidelines
          </a>{" "}
          for our policy on AI generated contributions.
        </p>
      </section>

      <section>
        <PageHeader id="learn-more" title="Learn more" />
        <p className="text-sm leading-relaxed" style={textStyle}>
          Full setup details live in the{" "}
          <a
            href={physlibAiToolsRepo}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            PhyslibAItools repository with the open-source code.
          </a>
          . If you have questions, ask in the{" "}
          <a
            href={site.zulip}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            Physlib Zulip
          </a>
          .
        </p>
      </section>
    </div>
  );
}
