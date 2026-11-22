import type { Metadata } from "next";
import Link from "next/link";
import { API_STATUS_DOT, API_STATUS_LABEL, type ApiStatusKind } from "@/lib/api-map-status";
import { getApiMap } from "@/lib/yaml";
import { ApiDetailView } from "@/components/api-tracker/api-detail-view";
import { ApiFlowchart } from "@/components/api-tracker/api-flowchart";

const legend: ApiStatusKind[] = ["none", "unstarted", "partial", "complete"];

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
    <div className="page-frame-tracker px-5 sm:px-8 lg:px-10 lg:pt-8">
      <header aria-label="API Tracker overview" className="mb-6 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">API Tracker</h2>
          <Link href="/api-tracker/new" className="inline-flex shrink-0 items-center rounded-(--radius) border border-border px-3 py-1.5 text-sm text-foreground hover:border-accent hover:text-accent">
            Create an API map
          </Link>
        </div>
        <p className="mt-2 max-w-prose text-pretty text-sm leading-relaxed text-foreground/80">
          API maps are short articles on each area of physics in Physlib, linked to
          the Lean that formalizes it. Anyone can suggest an edit or start a new one.
        </p>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-xs">
          <p className="text-muted">
            {apiMap.nodes.length} indexed maps
            {lastUpdated && <> · Index generated <time dateTime={apiMap.generatedAt}>{lastUpdated} UTC</time></>}
          </p>
          <ul aria-label="Map status" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-foreground/80">
            {legend.map((status) => (
              <li key={status} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2 rounded-full ${API_STATUS_DOT[status]}`} />
                {API_STATUS_LABEL[status]}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <ApiDetailView apiMap={apiMap} />

      <section id="dependency-map" className="mt-14 scroll-mt-20">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">Dependency map</h2>
        <p className="text-muted mb-4 text-sm leading-relaxed">
          See what the current API map cites, which maps cite it, or how all
          the maps connect.
        </p>
        <ApiFlowchart nodes={apiMap.nodes} />
      </section>
    </div>
  );
}
