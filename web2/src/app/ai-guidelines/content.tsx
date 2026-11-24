import { Card } from "@heroui/react";
import { PageHeader } from "@/components/page-header";
import { site } from "@/lib/site";

const textStyle = { letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" };

export function AiGuidelinesContent({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  return (
    <>
      <p className="page-intro-editorial page-intro-tinted max-w-2xl mb-12">
        Guidance on using AI tools responsibly when contributing to Physlib.
      </p>

      <section className="mb-12">
        <PageHeader headingLevel={headingLevel} id="where-ai-code-is-allowed" title="Where AI-Generated Code Is Allowed" />
        <p className="text-sm mb-6 leading-relaxed" style={textStyle}>
          Physlib is split into two areas with different tolerances for
          AI-generated proofs, reflecting how much scrutiny each area&apos;s
          code receives before it&apos;s relied on.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="default">
            <Card.Header>
              <Card.Title>
                <code className="font-mono text-sm">/Physlib</code>
              </Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90">
              <p className="leading-relaxed" style={textStyle}>
                AI assistance is permitted when preparing
                pull requests for this area, but stricter code quality
                requirements apply. A human must do the bulk of the work and make the decisions.
              </p>
            </Card.Content>
          </Card>
          <Card variant="default">
            <Card.Header>
              <Card.Title>
                <code className="font-mono text-sm">/PhyslibAlpha</code>
              </Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90">
              <p className="leading-relaxed" style={textStyle}>
                This is a downstream staging ground for formalizations. AI-generated code is allowed here so the review process is less strict. First drafts of theorems can go in here and then a human can use them as inspiration to produce higher quality code in{" "}<code className="font-mono text-xs">/Physlib</code>.
              </p>
            </Card.Content>
          </Card>
        </div>
      </section>

      <section className="mb-12">
        <PageHeader
          headingLevel={headingLevel}
          id="stricter-requirements-for-physlib"
          title="Stricter Requirements for /Physlib Pull Requests"
        />
        <p className="text-sm mb-4 leading-relaxed" style={textStyle}>
          If you use AI tools to help write a pull request targeting{" "}
          <code className="font-mono text-xs">/Physlib</code>, you are
          responsible for the result. In particular:
        </p>
        <ul className="space-y-2 ml-4 text-sm text-foreground/90">
          <li className="flex gap-3">
            <span className="text-accent flex-shrink-0">—</span>
            You must understand every definition and proof you submit well
            enough to explain and defend it during review.
          </li>
          <li className="flex gap-3">
            <span className="text-accent flex-shrink-0">—</span>
            <div className="flex-1">
              The code must follow the same style, naming, and structure conventions described in the <a href="/getting-started#writing-results" className="text-accent hover:underline underline-offset-2">Getting Started</a> guide. You must make sure your code is in the correct sub-folder of Physlib and does not duplicate existing code.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="text-accent flex-shrink-0">—</span>
            Do not submit unreviewed AI output.
          </li>
          <li className="flex gap-3">
            <span className="text-accent flex-shrink-0">—</span>
            Check every bibliographic reference yourself, and do not use an AI
            agent to talk to reviewers.
          </li>
        </ul>
        <p className="text-sm mt-4 leading-relaxed" style={textStyle}>
          See the repository&apos;s{" "}
          <a
            href={`${site.github}/blob/master/AI-POLICY.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            AI policy
          </a>{" "}
          for the full rules on AI-assisted pull requests, and{" "}
          <a
            href={`${site.github}/blob/master/AGENTS.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline underline-offset-2"
          >
            AGENTS.md
          </a>{" "}
          for the instructions your agent should follow.
        </p>
      </section>

      <section>
        <PageHeader headingLevel={headingLevel} id="questions" title="Questions" />
        <p className="text-sm leading-relaxed" style={textStyle}>
          If you&apos;re unsure whether your use of AI tools fits these
          guidelines, or which of{" "}
          <code className="font-mono text-xs">/Physlib</code> or{" "}
          <code className="font-mono text-xs">/PhyslibAlpha</code> your
          contribution belongs in, ask in the{" "}
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
    </>
  );
}
