import type { Metadata } from "next";
import { PhyslibAiToolsContent } from "./content";

export const metadata: Metadata = {
  title: "PhyslibAItools | Physlib",
  description:
    "PhyslibAItools is a companion project of AI-assisted tooling for Physlib.",
};

export default function PhyslibAiToolsPage() {
  return (
    <div className="page-frame-editorial">
      <p className="label-mono text-muted mb-5">AI Tools</p>
      <h1 className="page-title-editorial">
        PhyslibAItools
      </h1>
      <PhyslibAiToolsContent />
    </div>
  );
}
