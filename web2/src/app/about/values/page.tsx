import type { Metadata } from "next";
import { ValuesContent } from "@/components/about-section-content";
import { AboutOverviewLink, AboutSectionNav } from "@/components/about-section-nav";

export const metadata: Metadata = {
  title: "Values",
  description:
    "The principles Physlib is built on — welcoming, open and transparent, accessible and practical.",
};

export default function ValuesPage() {
  return (
    <div className="page-frame-editorial">

      <AboutOverviewLink />
      <h1 className="page-title-editorial mb-6">
        Values
      </h1>
      <p className="page-intro-statement mb-12">
        Built on principles.
      </p>

      <ValuesContent />

      <AboutSectionNav current="/about/values" />
    </div>
  );
}
