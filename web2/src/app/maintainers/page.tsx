import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { PageHeader } from "@/components/page-header";
import { getMaintainers } from "@/lib/yaml";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Maintainers | Physlib",
  description:
    "The maintainers of the Physlib project — the people responsible for reviewing and merging pull requests.",
};

export default async function MaintainersPage() {
  const maintainers = await getMaintainers();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">Maintainers</h1>
      <p className="text-muted mb-8 leading-relaxed">
        The following individuals are the maintainers of this project. They have
        the power to approve the merger of pull requests, and the responsibility
        to ensure that the project is well-maintained and that the codebase is
        of high quality.
      </p>

      <div className="rounded-lg border border-border bg-surface px-5 py-4 text-sm mb-8">
        If you would like to contact the maintainers, please use the{" "}
        <a
          href={site.zulip}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          Lean Zulip
        </a>
        .
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {maintainers.map((m) => (
          <Card key={m.name} variant="default" className="h-full">
            <Card.Header>
              <Card.Title>{m.name}</Card.Title>
            </Card.Header>
            <Card.Content className="text-sm text-foreground/90 leading-relaxed">
              {m.summary.trim().split(/\n\s*\n/).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </Card.Content>
          </Card>
        ))}
      </div>

      <PageHeader title="Get Involved" className="mt-12" />
      <p className="text-foreground/90 mb-4">
        Physlib is a community project. There are many ways to contribute —
        whether you&apos;re a physicist, a Lean enthusiast, or both.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/get-involved">Ways to Contribute</ButtonLink>
        <ButtonLink href={site.zulip} variant="tertiary">
          Join the Zulip
        </ButtonLink>
      </div>
    </div>
  );
}
