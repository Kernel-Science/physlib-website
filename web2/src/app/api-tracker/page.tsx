import type { Metadata } from "next";
import Link from "next/link";
import { getApiMap } from "@/lib/yaml";
import { ApiDetailView } from "@/components/api-tracker/api-detail-view";
import { ApiFlowchart } from "@/components/api-tracker/api-flowchart";

export const metadata: Metadata = {
  title: "API Tracker | Physlib",
  description:
    "Read Physlib's API maps: articles on each area of physics in Physlib, linked to the Lean declarations that formalize them.",
};

export default async function APITrackerPage() {
  const apiMap = await getApiMap();
  const lastUpdated = apiMap.generatedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(apiMap.generatedAt))
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <p className="text-sm leading-relaxed text-muted">
          <span className="text-foreground">API maps</span> are short articles
          on each area of physics in Physlib, linked to the Lean that
          formalizes it. Anyone can suggest an edit or start a new one.
          <span className="block text-xs">
            {apiMap.nodes.length} API maps ·{" "}
            {lastUpdated ? `Last updated: ${lastUpdated} UTC` : "Last updated: unknown"}
          </span>
        </p>
        <Link
          href="/api-tracker/new"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <span aria-hidden>＋</span>
          Create an API map
        </Link>
      </div>

      <ApiDetailView apiMap={apiMap} />

      <section className="mt-14">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">Dependency map</h2>
        <p className="text-muted mb-4 text-sm leading-relaxed">
          Every API map, each shown below an API map it cites. Click a
          box to open it above. Green boxes have every claim formalized, yellow
          are in progress, and red have none formalized yet; dashed boxes are
          cited by another map but have no <code>API-map.md</code> of their
          own yet.
        </p>
        <ApiFlowchart nodes={apiMap.nodes} />
      </section>
    </div>
  );
}
