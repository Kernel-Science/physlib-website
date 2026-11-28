import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import type { ReactNode } from "react";
import { DownstreamCards } from "@/components/downstream-cards";
import { GrowthCharts } from "@/components/growth-charts";
import { site } from "@/lib/site";
import { getDownstream, getGrowth, getSponsorPitch } from "@/lib/yaml";

/**
 * A section's Markdown, with each `<!-- name -->` marker that names a block
 * replaced by that block. data/Sponsor.md uses these to place the growth
 * charts and the downstream-project cards.
 */
function SectionBody({ body, blocks }: { body: string; blocks: Record<string, ReactNode> }) {
  const parts = body.split(/<!--\s*([a-z-]+)\s*-->/);
  // split() with a capture group alternates text and marker names.
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          part.trim() && <Markdown key={i}>{part}</Markdown>
        ) : (
          <div key={i}>{blocks[part] ?? null}</div>
        ),
      )}
    </>
  );
}

export const metadata: Metadata = {
  title: "Project Priorities",
  description:
    "Where contributors can help Physlib, its funding priorities, and what they would cost.",
};

/** Ids a section's heading used to have, kept as anchors so old links still land on it. */
const previousHeadingIds: Record<string, string[]> = {
  "funding-priorities-and-estimated-costs": [
    "what-funding-would-make-possible",
    "projects-and-estimated-costs",
    "what-we-could-do-with-your-support",
  ],
  // "Community and review" was removed; its links now land on the section that covers the community.
  "where-physlib-is-today": ["community-and-review", "who-you-would-be-supporting"],
};

/** The section the intro's "what its funding priorities would cost" link (`#priorities`) points to. */
const PRIORITIES_SECTION = "funding-priorities-and-estimated-costs";

export default async function SponsorPage() {
  const [pitch, growth, downstream] = await Promise.all([getSponsorPitch(), getGrowth(), getDownstream()]);
  const blocks = {
    "growth-charts": <GrowthCharts growth={growth} />,
    "downstream-cards": <DownstreamCards groups={downstream} />,
  };

  return (
    <div className="sponsor-page page-frame-editorial max-w-3xl">
      <p className="label-mono text-muted mb-5">Support</p>
      <h1 className="page-title-editorial">{pitch.title}</h1>
      <div className="page-intro-editorial mb-10">
        <Markdown>{pitch.intro}</Markdown>
      </div>

      <Card id="contribute" variant="default" className="mb-12 scroll-mt-20">
        <Card.Header>
          <Card.Title>Ways to help</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 text-sm text-foreground/90">
          <p>
            You can{" "}
            <a href="/pr-tracker" className="text-accent hover:underline underline-offset-2">review a pull request</a>,
            help a newcomer learn Lean, or{" "}
            <a href={site.tasks} className="text-accent hover:underline underline-offset-2">find a task</a>{" "}
            in an area of physics you know. If you use an AI agent, start with the{" "}
            <a href={site.aiResources + "#ai-guidelines"} className="text-accent hover:underline underline-offset-2">
              Physlib AI guidelines
            </a>.
          </p>
          <p>
            If you come across a grant call that fits one of Physlib&apos;s funding priorities,
            share the link in the{" "}
            <a href={site.zulip} className="text-accent hover:underline underline-offset-2">
              Physlib channel on Lean Zulip
            </a>{" "}
            or{" "}
            <a href="mailto:js4814@bath.ac.uk" className="text-accent hover:underline underline-offset-2">
              email Joseph Tooby-Smith
            </a>. Include the deadline if there is one.
          </p>
        </Card.Content>
      </Card>

      {/* One block per `##` section of data/Sponsor.md. */}
      {pitch.sections.map((section, i) => (
        <section
          key={section.id}
          id={previousHeadingIds[section.id]?.[0]}
          className="mb-12 scroll-mt-20 border-t border-border pt-8"
        >
          {previousHeadingIds[section.id]?.slice(1).map((oldId) => (
            <span key={oldId} id={oldId} className="block scroll-mt-20" aria-hidden="true" />
          ))}
          <div
            id={section.id === PRIORITIES_SECTION ? "priorities" : undefined}
            className="mb-4 flex scroll-mt-20 items-baseline gap-4"
          >
            {/* Same number style as Ways to Contribute, scaled to this page's larger headings. */}
            <span className="shrink-0 font-mono text-base font-medium text-accent md:text-lg" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2
              id={section.id}
              className="text-2xl font-medium text-foreground md:text-3xl"
              style={{ letterSpacing: "-0.04em" }}
            >
              {section.heading}
            </h2>
          </div>
          <div className="sponsor-pitch text-foreground/90">
            <SectionBody body={section.body} blocks={blocks} />
          </div>
        </section>
      ))}

      <p id="sponsors" className="scroll-mt-20 border-t border-border pt-8 text-sm text-foreground/90">
        See who already supports Physlib on the{" "}
        <a href={site.sponsors} className="text-accent hover:underline underline-offset-2">
          sponsors page
        </a>
        .
      </p>

      {pitch.footnotes.length > 0 && (
        <section aria-label="Footnotes" className="sponsor-footnotes mt-12 border-t border-border pt-6 text-xs leading-relaxed text-muted">
          <ol className="flex flex-col gap-1.5">
            {pitch.footnotes.map((note) => (
              <li key={note.label} id={`footnote-${note.label}`} className="flex scroll-mt-20 gap-2">
                <span className="w-4 shrink-0 text-right tabular-nums">{note.number}.</span>
                <Markdown>{note.text}</Markdown>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
