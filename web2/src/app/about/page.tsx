import type { Metadata } from "next";
import type { ComponentType } from "react";
import {
  BeneficiariesContent,
  ImpactContent,
  MissionContent,
  ValuesContent,
} from "@/components/about-section-content";
import { AboutRelatedLinks } from "@/components/about-section-nav";
import { aboutSections } from "@/lib/about-content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "The mission, values, beneficiaries, and intended impact of Physlib — a library of digitalized physics results in Lean 4.",
};

const panels: Record<string, ComponentType<{ headingLevel?: 2 | 3 }>> = {
  "/about/mission": MissionContent,
  "/about/values": ValuesContent,
  "/about/beneficiaries": BeneficiariesContent,
  "/about/impact": ImpactContent,
};

const overviewSections = aboutSections.filter((section) => section.href !== "/team");

export default function AboutPage() {
  return (
    <div className="page-frame-editorial">

      {/* Page intro */}
      <p className="label-mono text-muted mb-5">About</p>
      <h1 className="page-title-editorial">
        About Physlib
      </h1>
      <p className="page-intro-editorial max-w-2xl mb-14">
        {site.description}
      </p>

      <div id="about-overview" className="grid scroll-mt-20 gap-4 sm:grid-cols-2">
        {overviewSections.map((s, i) => (
          <a
            key={s.href}
            href={`#${s.href.slice("/about/".length)}`}
            className="flex flex-col rounded border border-border bg-background p-6 shadow-together transition-colors hover:bg-foreground/5"
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
          </a>
        ))}
      </div>

      {overviewSections.map((section) => {
        const id = section.href.slice("/about/".length);
        const Content = panels[section.href];

        return (
          <section
            key={section.href}
            id={id}
            aria-labelledby={`${id}-title`}
            tabIndex={-1}
            className="mt-12 scroll-mt-20 border-t border-border pt-8"
          >
            <h2 id={`${id}-title`} className="mb-3 text-3xl font-medium tracking-tight">
              {section.label}
            </h2>
            <p className="mb-8 text-lg text-muted">{section.tagline}</p>
            <Content headingLevel={3} />
          </section>
        );
      })}

      <AboutRelatedLinks />
    </div>
  );
}
