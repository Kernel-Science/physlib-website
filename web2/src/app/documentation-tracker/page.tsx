import type { Metadata } from "next";
import { DocumentationGuide } from "@/components/documentation-guide";
import { DocumentationTrackerClient } from "./documentation-tracker-client";

export const metadata: Metadata = {
  title: "Documentation Tracker | Physlib",
  description:
    "Find Physlib files that need documentation and explore the import graph.",
};

export default function DocumentationTrackerPage() {
  return (
    <div className="page-frame-tracker">
      <h1 className="page-title-tracker">
        Documentation Tracker
      </h1>
      <DocumentationTrackerClient />

      <DocumentationGuide />
    </div>
  );
}
