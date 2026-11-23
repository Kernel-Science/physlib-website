import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { site } from "@/lib/site";
import { getSponsors } from "@/lib/yaml";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "The organisations and people who currently support Physlib.",
};

export default async function SponsorsPage() {
  const sponsors = await getSponsors();

  return (
    <div className="page-frame-editorial max-w-3xl">
      <p className="label-mono text-muted mb-5">Support</p>
      <h1 className="page-title-editorial">Sponsors</h1>
      <p className="page-intro-editorial mb-10">
        Physlib is grateful to the organisations and people who support it.
      </p>

      <h2
        id="current-sponsors"
        className="text-2xl font-medium text-foreground mb-4 md:text-3xl"
        style={{ letterSpacing: "-0.025em" }}
      >
        Current sponsors
      </h2>
      <ul className="mb-12 grid gap-4 sm:grid-cols-2">
        {sponsors.map((sponsor) => (
          <li
            key={sponsor.name}
            className="rounded border border-border bg-background p-6 shadow-together"
          >
            <a
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-medium text-foreground hover:text-accent transition-colors"
              style={{ letterSpacing: "-0.025em" }}
            >
              {sponsor.name}
            </a>
            <p className="mt-2 text-sm text-muted leading-relaxed">{sponsor.support}</p>
          </li>
        ))}
      </ul>

      <div className="border-t border-border pt-8">
        <p className="mb-4 text-sm text-foreground/90">
          Would you like to see your name here? Find out what your support
          would make possible.
        </p>
        <ButtonLink href={site.sponsor} size="sm">
          Fund Physlib
        </ButtonLink>
      </div>
    </div>
  );
}
