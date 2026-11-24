import type { Metadata } from "next";
import { getReferences } from "@/lib/yaml";
import { ReferencesClient } from "./references-client";

export const metadata: Metadata = {
  title: "References",
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
      <p className="label-mono text-muted mb-5">Explore</p>
      <h1 className="page-title-tracker">References</h1>
      <p className="page-intro-tracker mb-6">
        Physlib stores its references in{" "}
        <a
          href={`https://github.com/${data.repo}/blob/${data.branch}/docs/references.bib`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          <code className="font-mono text-xs bg-surface-secondary px-1.5 py-0.5 rounded">docs/references.bib</code>
        </a>
        . This page shows where each one is cited in the Lean files.
      </p>
      <p className="text-xs text-muted mb-8">
        {citedReferences.length} cited references &middot;{" "}
        {totalCitations} citations across the repo
        {lastUpdated ? ` · Last updated: ${lastUpdated} UTC` : ""}
      </p>

      <ReferencesClient references={data.references} />

    </div>
  );
}
