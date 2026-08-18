import type { Metadata } from "next";
import { DependenciesClient } from "./dependencies-client";

export const metadata: Metadata = {
  title: "Dependencies | Physlib",
  description:
    "Explore the dependency graph of Physlib modules. Filter by sources and targets to visualize specific paths.",
};

export default function DependenciesPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">
        Dependency Graphs
      </h1>
      <p className="text-muted mb-8 leading-relaxed">
        Visualize the dependency graph of Physlib modules. Select sources and
        targets below, or use URL parameters{" "}
        <code className="font-mono text-xs bg-surface-secondary px-1 py-0.5 rounded">
          ?sources=A,B&amp;targets=C
        </code>{" "}
        to link to a specific view. Graph controls: drag to pan, scroll to zoom,
        click nodes to open on GitHub.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        <span className="text-sm text-muted mr-1">Premade views:</span>
        {premadeLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-accent hover:underline underline-offset-2"
          >
            {link.label}
          </a>
        ))}
      </div>

      <DependenciesClient />
    </div>
  );
}

const premadeLinks = [
  { label: "Everything", href: "/dependencies?sources=&targets=Physlib" },
  {
    label: "Proof of Wick's theorem",
    href: "/dependencies?sources=Physlib.SpaceAndTime.SpaceTime.Basic,Physlib.Mathematics.List.InsertIdx,Physlib.Mathematics.Fin,Physlib.QFT.PerturbationTheory.CreateAnnihilate&targets=Physlib.QFT.PerturbationTheory.WickAlgebra.WicksTheorem",
  },
  {
    label: "Everything dependent on space-time",
    href: "/dependencies?sources=Physlib.SpaceAndTime.Space.Basic",
  },
  {
    label: "1d QM harmonic oscillator",
    href: "/dependencies?sources=&targets=Physlib.QuantumMechanics.OneDimension.HarmonicOscillator.TISE",
  },
];
