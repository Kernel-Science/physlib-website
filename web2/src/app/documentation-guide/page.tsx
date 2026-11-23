import type { Metadata } from "next";
import Link from "next/link";
import { DocumentationGuide } from "@/components/documentation-guide";

export const metadata: Metadata = {
  title: "Documentation Guide | Physlib",
  description: "Learn how to document a Lean file in Physlib and use the module import graph.",
};

export default function DocumentationGuidePage() {
  return (
    <div className="page-frame-tracker">
      <Link
        href="/get-involved#steps-to-help-with-documentation"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline underline-offset-2"
      >
        <span aria-hidden="true">←</span>
        Ways to Contribute
      </Link>
      <h1 className="page-title-tracker">Documentation Guide</h1>
      <DocumentationGuide context="guide" />
    </div>
  );
}
