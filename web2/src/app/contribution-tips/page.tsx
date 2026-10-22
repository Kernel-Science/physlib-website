import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseContributionTips } from "@/lib/contribution-tips-content";
import { site } from "@/lib/site";
import { TipsMarkdown } from "./tips-markdown";
import { TipsAccordion } from "./tips-accordion";

export const metadata: Metadata = {
  title: "Contribution tips",
  description: "Tips from the Physlib community for contributors.",
};

export default async function ContributionTipsPage() {
  const document = await readFile(
    path.join(process.cwd(), "data/contribution-tips.md"), "utf8"
  );
  const sections = parseContributionTips(document);

  return (
    <article className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">
      <p className="label-mono text-muted mb-5">Community</p>
      <h1
        className="text-4xl font-medium text-foreground mb-4 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        Contribution tips
      </h1>
      <p
        className="text-lg max-w-2xl mb-12 leading-snug"
        style={{
          letterSpacing: "-0.01em",
          lineHeight: 1.4,
          color: "color-mix(in srgb, var(--foreground) 80%, var(--accent))",
        }}
      >
        A collection of tips from the Physlib community.
      </p>

      <TipsAccordion>
        {sections.map((tip) => (
          <details key={tip.id} id={tip.id} className="group scroll-mt-24">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-5 text-foreground hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
              <h2 className="text-xl font-medium tracking-heading sm:text-2xl">
                {tip.number}. {tip.title}
              </h2>
              <svg
                aria-hidden="true"
                className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <div className="pb-6">
              <TipsMarkdown>{tip.body}</TipsMarkdown>
            </div>
          </details>
        ))}
      </TipsAccordion>
      <p className="mt-8 text-sm">
        <a
          href={`${site.github}/edit/master/docs/contribution-tips.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          Edit these tips on GitHub ↗
        </a>
      </p>
    </article>
  );
}
