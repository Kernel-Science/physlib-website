import type { Metadata } from "next";
import Link from "next/link";
import { AiGuidelinesContent } from "./content";

export const metadata: Metadata = {
  title: "AI Guidelines",
  description:
    "Guidelines for using AI tools when contributing to Physlib.",
};

export default function AiGuidelinesPage() {
  return (
    <div className="page-frame-editorial">
      <Link
        href="/ai-resources#ai-guidelines"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline underline-offset-2"
      >
        <span aria-hidden="true">←</span>
        AI Resources
      </Link>
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        AI Guidelines
      </h1>
      <AiGuidelinesContent />
    </div>
  );
}
