import type { Metadata } from "next";
import { ImpactContent } from "@/components/about-section-content";
import { AboutOverviewLink, AboutRelatedLinks, AboutSectionNav } from "@/components/about-section-nav";

export const metadata: Metadata = {
  title: "Impact",
  description:
    "Why formalize physics — what a library of digitalized physics results makes possible.",
};

export default function ImpactPage() {
  return (
    <div className="page-frame-editorial">

      <AboutOverviewLink />
      <h1 className="page-title-editorial mb-6">
        Impact
      </h1>
      <p className="page-intro-statement mb-12">
        Why formalize physics?
      </p>

      <ImpactContent />
      <AboutRelatedLinks />

      <AboutSectionNav current="/about/impact" />
    </div>
  );
}
