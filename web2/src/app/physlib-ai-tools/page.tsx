import type { Metadata } from "next";
import Link from "next/link";
import { PhyslibAiToolsContent } from "./content";

export const metadata: Metadata = {
  title: "Physlib AI Tools",
  description:
    "Physlib AI Tools is a companion project of AI-assisted tooling for Physlib.",
};

export default function PhyslibAiToolsPage() {
  return (
    <div className="page-frame-editorial">
      <Link
        href="/ai-resources#physlib-ai-tools"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline underline-offset-2"
      >
        <span aria-hidden="true">←</span>
        AI Resources
      </Link>
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        Physlib AI Tools
      </h1>
      <PhyslibAiToolsContent />
    </div>
  );
}
