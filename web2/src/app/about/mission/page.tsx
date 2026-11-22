import type { Metadata } from "next";
import { AboutSectionNav } from "@/components/about-section-nav";
import { missionStatement, visionPoints } from "@/lib/about-content";

export const metadata: Metadata = {
  title: "Mission",
  description: missionStatement,
};

export default function MissionPage() {
  return (
    <div className="page-frame-editorial">

      <p className="label-mono text-muted mb-5">About</p>
      <h1 className="page-title-editorial mb-6">
        Mission
      </h1>
      <p className="page-intro-statement mb-14">
        Create a library of digitalized physics results in Lean&nbsp;4,
        useful to the broad physics community.
      </p>

      <div className="grid gap-x-16 gap-y-5 sm:grid-cols-2">
        {visionPoints.map((point, i) => (
          <div key={i} className="flex items-start gap-5">
            <span className="label-mono text-accent/50 flex-shrink-0 pt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <p
              className="text-sm text-muted leading-relaxed"
              style={{ letterSpacing: "-0.01em" }}
            >
              {point}
            </p>
          </div>
        ))}
      </div>

      <AboutSectionNav current="/about/mission" />
    </div>
  );
}
