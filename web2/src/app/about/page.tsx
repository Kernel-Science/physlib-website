import type { Metadata } from "next";
import Link from "next/link";
import { aboutSections, paper } from "@/lib/about-content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "The mission, values, beneficiaries, and intended impact of Physlib — a library of digitalized physics results in Lean 4.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">

      {/* Page intro */}
      <p className="label-mono text-muted mb-5">About</p>
      <h1
        className="text-4xl font-medium text-foreground mb-4 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        About Physlib
      </h1>
      <p
        className="text-lg text-muted max-w-2xl mb-14 leading-snug"
        style={{ letterSpacing: "-0.01em", lineHeight: 1.4 }}
      >
        {site.description}
      </p>

      {/* Section index */}
      <div className="grid gap-4 sm:grid-cols-2">
        {aboutSections.map((s, i) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col rounded border border-border bg-background p-6 shadow-together transition-colors hover:bg-foreground/5"
          >
            <span className="label-mono text-accent/50 mb-4">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className="text-xl font-medium text-foreground mb-2"
              style={{ letterSpacing: "-0.025em" }}
            >
              {s.label}
            </span>
            <span
              className="text-sm text-muted leading-relaxed flex-1"
              style={{ letterSpacing: "-0.01em" }}
            >
              {s.tagline}
            </span>
            <span className="mt-5 text-xs text-muted transition-colors group-hover:text-foreground">
              Read more →
            </span>
          </Link>
        ))}
      </div>

      {/* Paper */}
      <div className="mt-16 border-t border-border pt-8 text-sm text-foreground/30">
        Read the paper:{" "}
        <a
          href={paper.href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground/60 transition-colors underline underline-offset-2"
        >
          {paper.label}
        </a>
      </div>
    </div>
  );
}
