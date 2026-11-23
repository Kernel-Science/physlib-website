import type { Metadata } from "next";
import { getReferences } from "@/lib/yaml";
import { ReferencesClient } from "./references-client";

export const metadata: Metadata = {
  title: "References | Physlib",
  description:
    "Every reference cited across Physlib, drawn from docs/references.bib and the [ref: key] tags in each file's References section.",
};

export default async function ReferencesPage() {
  const data = await getReferences();
  const lastUpdated = data.generatedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(data.generatedAt))
    : null;

  const citedReferences = data.references.filter((reference) => reference.citations.length > 0);
  const totalCitations = citedReferences.reduce((sum, reference) => sum + reference.citations.length, 0);

  return (
    <div className="page-frame-tracker">
      <h1 className="page-title-tracker">References</h1>
      <p className="page-intro-tracker mb-1">
        Physlib uses the <code className="font-mono text-xs bg-surface-secondary px-1.5 py-0.5 rounded">
          docs/references.bib
        </code> to store the references used within the project. This page shows details of how these references are used across all the Lean files.
      </p>
      <p className="text-xs text-muted mb-8">
        {citedReferences.length} cited references &middot;{" "}
        {totalCitations} citations across the repo
        {lastUpdated ? ` · Last updated: ${lastUpdated} UTC` : ""}
      </p>

      <ReferencesClient references={citedReferences} repo={data.repo} branch={data.branch} />
    </div>
  );
}
