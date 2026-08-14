import type { Metadata } from "next";
import { AboutSectionNav } from "@/components/about-section-nav";
import { audiences } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Beneficiaries",
  description:
    "Who Physlib is for — researchers, students, companies, and labs working with physics and formal methods.",
};

export default function BeneficiariesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">

      <p className="label-mono text-muted mb-5">About</p>
      <h1
        className="text-4xl font-medium text-foreground mb-6 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        Beneficiaries
      </h1>
      <p
        className="max-w-3xl text-2xl font-medium text-foreground mb-12 md:text-3xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.15 }}
      >
        For physicists and formal-methods researchers.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {audiences.map((a) => (
          <div
            key={a.title}
            className="rounded border border-border bg-background p-7 shadow-together"
          >
            <p className="label-mono text-muted mb-3">{a.tag}</p>
            <h2
              className="text-xl font-medium text-foreground mb-6"
              style={{ letterSpacing: "-0.025em" }}
            >
              {a.title}
            </h2>
            <ul className="space-y-4">
              {a.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-4 text-sm text-muted"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  <span className="flex-shrink-0 text-accent">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <AboutSectionNav current="/about/beneficiaries" />
    </div>
  );
}
