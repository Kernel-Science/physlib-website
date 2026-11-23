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
    <div className="page-frame-editorial">

      <p className="label-mono text-muted mb-5">About</p>
      <h1 className="page-title-editorial mb-6">
        Beneficiaries
      </h1>
      <p className="page-intro-statement mb-12">
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
