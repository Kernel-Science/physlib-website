import type { Metadata } from "next";
import { MissionContent } from "@/components/about-section-content";
import { AboutOverviewLink, AboutSectionNav } from "@/components/about-section-nav";
import { missionStatement } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Mission",
  description: missionStatement,
};

export default function MissionPage() {
  return (
    <div className="page-frame-editorial">

      <AboutOverviewLink />
      <h1 className="page-title-editorial mb-6">
        Mission
      </h1>
      <p className="page-intro-statement mb-14">
        Create a library of digitalized physics results in Lean&nbsp;4,
        useful to the broad physics community.
      </p>

      <MissionContent />

      <AboutSectionNav current="/about/mission" />
    </div>
  );
}
