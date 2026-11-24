import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { site } from "@/lib/site";
import { getSponsorPitch } from "@/lib/yaml";

export const metadata: Metadata = {
  title: "Project Priorities",
  description:
    "Where contributors can help Physlib and what larger research and infrastructure projects could cost.",
};

const previousHeadingIds: Record<string, string> = {
  "projects-and-estimated-costs": "what-we-could-do-with-your-support",
  "community-and-review": "who-you-would-be-supporting",
};

export default async function SponsorPage() {
  const pitch = await getSponsorPitch();

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
            If you come across a grant call that fits one of these projects,
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
          id={previousHeadingIds[section.id]}
          className="mb-12 scroll-mt-20 border-t border-border pt-8"
        >
          <div
            id={section.id === "projects-and-estimated-costs" ? "priorities" : undefined}
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
            <Markdown>{section.body}</Markdown>
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
    </div>
  );
}
