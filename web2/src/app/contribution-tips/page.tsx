import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PageHeader } from "@/components/page-header";
import { parseContributionTips } from "@/lib/contribution-tips-content";
import { site } from "@/lib/site";
import { TipsMarkdown } from "./tips-markdown";

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

      <nav aria-label="Contents" className="mb-12 lg:hidden">
        <p className="label-mono mb-3 text-muted">On this page</p>
        <ol className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {sections.map((tip) => (
            <li key={tip.id}>
              <a className="text-accent hover:underline underline-offset-2" href={`#${tip.id}`}>
                {tip.number}. {tip.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((tip) => (
        <section key={tip.id} className="mb-12 last:mb-0">
          <PageHeader id={tip.id} title={`${tip.number}. ${tip.title}`} />
          <TipsMarkdown>{tip.body}</TipsMarkdown>
        </section>
      ))}
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
