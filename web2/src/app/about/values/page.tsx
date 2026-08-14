import type { Metadata } from "next";
import { AboutSectionNav } from "@/components/about-section-nav";
import { values } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Values",
  description:
    "The principles Physlib is built on — welcoming, open and transparent, accessible and practical.",
};

export default function ValuesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">

      <p className="label-mono text-muted mb-5">About</p>
      <h1
        className="text-4xl font-medium text-foreground mb-6 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        Values
      </h1>
      <p
        className="max-w-3xl text-2xl font-medium text-foreground mb-12 md:text-3xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.15 }}
      >
        Built on principles.
      </p>

      <div className="divide-y divide-border border-t border-border">
        {values.map((v, i) => (
          <div
            key={v.title}
            className="grid grid-cols-[2.5rem_1fr] md:grid-cols-[3rem_16rem_1fr] gap-x-8 md:gap-x-12 py-8 items-start"
          >
            <span className="label-mono text-accent pt-1">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h2
              className="text-lg font-medium text-foreground"
              style={{ letterSpacing: "-0.025em" }}
            >
              {v.title}
            </h2>
            <p
              className="col-start-2 md:col-start-3 mt-3 md:mt-0 text-sm text-muted leading-relaxed"
              style={{ letterSpacing: "-0.01em" }}
            >
              {v.body}
            </p>
          </div>
        ))}
      </div>

      <AboutSectionNav current="/about/values" />
    </div>
  );
}
