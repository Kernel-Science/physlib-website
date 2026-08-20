import type { Metadata } from "next";
import { getApiMap } from "@/lib/yaml";
import { ApiDetailView } from "@/components/api-tracker/api-detail-view";
import { ApiFlowchart } from "@/components/api-tracker/api-flowchart";

export const metadata: Metadata = {
  title: "API Tracker | Physlib",
  description:
    "Browse the APIs defined across Physlib, from their API-map.yaml files.",
};

export default async function APITrackerPage() {
  const apiMap = await getApiMap();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <ApiDetailView apiMap={apiMap} />

      <section className="mt-10">
        <h2 className="mb-1 text-sm font-semibold tracking-tight">Dependency map</h2>
        <p className="text-muted mb-4 text-sm leading-relaxed">
          Every API, with each one shown below the parent it builds on. Click a
          box to open it above. Green boxes have all their requirements done,
          yellow are in progress, and red have none done yet; dashed boxes are
          referenced as a parent but have no <code>API-map.yaml</code> of their
          own yet.
        </p>
        <ApiFlowchart nodes={apiMap.nodes} />
      </section>
    </div>
  );
}
