import type { Metadata } from "next";
import { DependenciesClient } from "./dependencies-client";

export const metadata: Metadata = {
  title: "Dependency Graphs",
  description:
    "Explore the dependency graph of Physlib modules. Filter by sources and targets to visualize specific paths.",
};

export default function DependenciesPage() {
  return (
    <div className="page-frame-tracker">
      <p className="label-mono text-muted mb-5">Explore</p>
      <h1 className="page-title-tracker">Dependency Graphs</h1>
      <p className="page-intro-tracker mb-8">
        Follow the arrows from prerequisites to the modules that import them.
        Select a module to expand its subject, or use the Customizer to trace a path between modules.
      </p>

      <DependenciesClient />

    </div>
  );
}
