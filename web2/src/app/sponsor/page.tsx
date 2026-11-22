import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sponsor | Physlib",
  description:
    "Support Physlib financially to help grow the definitive library of formalized physics in Lean 4.",
};

export default function SponsorPage() {
  return (
    <div className="page-frame-editorial max-w-2xl">
      <p className="label-mono text-muted mb-5">Support</p>
      <h1 className="page-title-editorial">
        Sponsor Physlib
      </h1>
      <p className="page-intro-editorial mb-10">
        Financial support helps Physlib grow faster and reach more of the
        physics and Lean communities.
      </p>

      <Card variant="secondary" className="mb-6">
        <Card.Header>
          <Card.Title>What Your Support Enables</Card.Title>
        </Card.Header>
        <Card.Content>
          <ul className="list-disc ml-5 space-y-2 text-sm text-foreground/90">
            <li>
              Host servers for an online version of Physlib and search engines.
            </li>
            <li>
              Increase the rate of development of the project, and
              documentation.
            </li>
          </ul>
        </Card.Content>
      </Card>

      <Card variant="default">
        <Card.Header>
          <Card.Title>Get in Touch</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 text-sm text-foreground/90">
          <p>
            If you&apos;d be interested in helping support Physlib financially,
            please reach out to{" "}
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
    </div>
  );
}
