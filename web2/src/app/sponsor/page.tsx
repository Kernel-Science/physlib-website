import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { Markdown } from "@/components/markdown";
import { site } from "@/lib/site";
import { getSponsorPitch } from "@/lib/yaml";

export const metadata: Metadata = {
  title: "Support us | Physlib",
  description:
    "Support Physlib financially to help grow the definitive library of formalized physics in Lean 4.",
};

export default async function SponsorPage() {
  const pitch = await getSponsorPitch();

  return (
    <div className="page-frame-editorial max-w-3xl">
      <p className="label-mono text-muted mb-5">Support</p>
      <h1 className="page-title-editorial">{pitch.title}</h1>
      <div className="page-intro-editorial mb-10">
        <Markdown>{pitch.intro}</Markdown>
      </div>

      <Card id="contribute" variant="default" className="mb-12 scroll-mt-20">
        <Card.Header>
          <Card.Title>Donate</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 text-sm text-foreground/90">
          <p>
            We appreciate both financial and in-kind support. If you&apos;d
            like to help, please reach out to{" "}
            <a
              href="https://josephtoobysmith.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline underline-offset-2"
            >
              Joseph Tooby-Smith
            </a>
            :
          </p>
          <ul className="space-y-1">
            <li>
              <span className="text-muted">Email:</span>{" "}
              <span className="font-mono text-xs">js4814 [at] bath [dot] ac [dot] uk</span>
            </li>
            <li>
              <span className="text-muted">Preferred:</span> via the{" "}
              <a
                href={site.zulip}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline underline-offset-2"
              >
                Lean Zulip
              </a>
            </li>
          </ul>
          <div className="flex gap-3 mt-2">
            <ButtonLink href={site.zulip} size="sm">
              Message on Zulip
            </ButtonLink>
            <ButtonLink href="mailto:js4814@bath.ac.uk" size="sm" variant="tertiary">
              Send Email
            </ButtonLink>
          </div>
        </Card.Content>
      </Card>

      {/* One block per `##` section of data/Sponsor.md. */}
      {pitch.sections.map((section, i) => (
        <section key={section.id} className="mb-12 border-t border-border pt-8">
          <p className="label-mono text-accent/50 mb-3">
            {String(i + 1).padStart(2, "0")}
          </p>
          <h2
            id={section.id}
            className="text-2xl font-medium text-foreground mb-4 md:text-3xl"
            style={{ letterSpacing: "-0.025em" }}
          >
            {section.heading}
          </h2>
          <div className="sponsor-pitch text-foreground/90">
            <Markdown>{section.body}</Markdown>
          </div>
        </section>
      ))}

      <p className="border-t border-border pt-8 text-sm text-foreground/90">
        See who already supports Physlib on the{" "}
        <a href={site.sponsors} className="text-accent hover:underline underline-offset-2">
          sponsors page
        </a>
        .
      </p>
    </div>
  );
}
