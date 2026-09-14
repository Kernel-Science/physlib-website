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

  const cited = data.references.filter((r) => r.count > 0).length;
  const totalCitations = data.references.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">References</h1>
      <p className="text-muted mb-1 leading-relaxed">
        Physlib uses the <code className="font-mono text-xs bg-surface-secondary px-1.5 py-0.5 rounded">
          docs/references.bib
        </code> to store the references used within the project. This page shows details of how these references are used across all the Lean files.
      </p>
      <p className="text-xs text-muted mb-8">
        {data.references.length} references &middot; {cited} cited &middot;{" "}
        {totalCitations} citations across the repo
        {lastUpdated ? ` · Last updated: ${lastUpdated} UTC` : ""}
      </p>

      <ReferencesClient references={data.references} repo={data.repo} branch={data.branch} />
    </div>
  );
}
