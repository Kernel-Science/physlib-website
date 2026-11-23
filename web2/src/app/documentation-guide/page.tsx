import type { Metadata } from "next";
import Link from "next/link";
import { DocumentationGuide } from "@/components/documentation-guide";

export const metadata: Metadata = {
  title: "Documentation Guide",
  description: "Learn how to document a Lean file in Physlib and use the module import graph.",
};

export default function DocumentationGuidePage() {
  return (
    <div className="page-frame-editorial max-w-5xl">
      <Link
        href="/get-involved#steps-to-help-with-documentation"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline underline-offset-2"
      >
        <span aria-hidden="true">←</span>
        Ways to Contribute
      </Link>
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">Documentation Guide</h1>
      <p className="page-intro-editorial max-w-2xl">
        Use this guide to add module documentation to a Lean file in Physlib.
      </p>
      <DocumentationGuide context="guide" />
    </div>
  );
}
