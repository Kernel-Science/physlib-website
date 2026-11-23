import type { Metadata } from "next";
import { BeneficiariesContent } from "@/components/about-section-content";
import { AboutOverviewLink, AboutSectionNav } from "@/components/about-section-nav";

export const metadata: Metadata = {
  title: "Beneficiaries",
  description:
    "Who Physlib is for — researchers, students, companies, and labs working with physics and formal methods.",
};

export default function BeneficiariesPage() {
  return (
    <div className="page-frame-editorial">

      <AboutOverviewLink />
      <h1 className="page-title-editorial mb-6">
        Beneficiaries
      </h1>
      <p className="page-intro-statement mb-12">
        For physicists and formal-methods researchers.
      </p>

      <BeneficiariesContent />

      <AboutSectionNav current="/about/beneficiaries" />
    </div>
  );
}
