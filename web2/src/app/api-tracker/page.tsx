import type { Metadata } from "next";
import { getApiMap } from "@/lib/yaml";
import { APITrackerClient } from "./api-tracker-client";

export const metadata: Metadata = {
  title: "API Tracker | Physlib",
  description:
    "Visualize the API dependency graph for Physlib based on its API-map.yaml files.",
};

export default async function APITrackerPage() {
  const { nodes } = await getApiMap();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">API Tracker</h1>
      <p className="text-muted mb-8 leading-relaxed">
        This graph visualizes the APIs defined across Physlib, built from each
        API&apos;s <code>API-map.yaml</code> file. Green nodes have all their
        requirements done, yellow nodes are in progress, and red nodes have no
        requirements done yet. White nodes are referenced as a parent API but
        don&apos;t have their own API-map.yaml yet. Click a name in the list to
        highlight it in the graph.
      </p>
      <APITrackerClient nodes={nodes} />
    </div>
  );
}
