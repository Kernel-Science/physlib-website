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

      <Card id="priorities" variant="secondary" className="mb-6 scroll-mt-20">
        <Card.Header>
          <Card.Title>Priorities</Card.Title>
        </Card.Header>
        <Card.Content>
          <ul className="list-disc ml-5 space-y-2 text-sm text-foreground/90">
            <li>Let anyone write and check Lean against Physlib in their browser without installing it.</li>
            <li>Fund supervised summer projects and studentships that bring new contributors into Physlib.</li>
            <li>Bring contributors together to learn Lean and work on Physlib at an in-person event.</li>
            <li>Fund dedicated time to formalize new areas of physics, review contributions, and improve the library’s infrastructure.</li>
          </ul>
        </Card.Content>
      </Card>

      <Card id="contribute" variant="default" className="mb-6 scroll-mt-20">
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

      <Card id="sponsors" variant="default" className="scroll-mt-20">
        <Card.Header>
          <Card.Title>Sponsors</Card.Title>
        </Card.Header>
        <Card.Content className="text-sm text-foreground/90">
          <p>
            Thank you to{" "}
            <a
              href="https://kernel-science.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline underline-offset-2"
            >
              Kernel Science
            </a>
            {" "}for supporting the Physlib website.
          </p>
        </Card.Content>
      </Card>
    </div>
  );
}
