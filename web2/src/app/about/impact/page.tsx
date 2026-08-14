import type { Metadata } from "next";
import { AboutSectionNav } from "@/components/about-section-nav";
import { impacts, paper } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "Why formalize physics — what a library of digitalized physics results makes possible.",
};

export default function ImpactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">

      <p className="label-mono text-muted mb-5">About</p>
      <h1
        className="text-4xl font-medium text-foreground mb-6 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        Impact
      </h1>
      <p
        className="max-w-3xl text-2xl font-medium text-foreground mb-12 md:text-3xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.15 }}
      >
        Why formalize physics?
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {impacts.map((item, i) => (
          <div
            key={i}
            className="flex gap-5 rounded p-6 bg-background border border-border shadow-together"
          >
            <span
              className="text-2xl font-medium text-accent/40 font-mono flex-shrink-0 leading-none tabular-nums"
              style={{ letterSpacing: "-0.04em" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p
              className="text-sm text-muted leading-relaxed"
              style={{ letterSpacing: "-0.01em" }}
            >
              {item}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-foreground/30">
        Read the paper:{" "}
        <a
          href={paper.href}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground/60 transition-colors underline underline-offset-2"
        >
          {paper.label}
        </a>
      </p>

      <AboutSectionNav current="/about/impact" />
    </div>
  );
}
