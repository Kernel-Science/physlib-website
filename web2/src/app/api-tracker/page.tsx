import type { Metadata } from "next";
import { getApiMap } from "@/lib/yaml";
import { ApiFlowchart } from "@/components/api-tracker/api-flowchart";

export const metadata: Metadata = {
  title: "API Tracker | Physlib",
  description:
    "Visualize the API dependency flowchart for Physlib based on its API-map.yaml files.",
};

export default async function APITrackerPage() {
  const { nodes } = await getApiMap();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">API Tracker</h1>
      <p className="text-muted mb-8 leading-relaxed">
        This flowchart visualizes the APIs defined across Physlib, built from
        each API&apos;s <code>API-map.yaml</code> file, with each box&apos;s
        parent shown above it. Green boxes have all their requirements done,
        yellow boxes are in progress, and red boxes have no requirements done
        yet. Dashed boxes are referenced as a parent API but don&apos;t have
        their own API-map.yaml yet.
      </p>
      <ApiFlowchart nodes={nodes} />
    </div>
  );
}
