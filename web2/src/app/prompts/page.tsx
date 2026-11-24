import type { Metadata } from "next";
import Link from "next/link";
import { PromptsContent } from "./content";

export const metadata: Metadata = {
  title: "Useful Prompts",
  description:
    "Ready-made prompts for common Physlib tasks, filled in with the Lean subfolder you're working on.",
};

export default function PromptsPage() {
  return (
    <div className="page-frame-editorial max-w-5xl">
      <Link
        href="/ai-resources#useful-prompts"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline underline-offset-2"
      >
        <span aria-hidden="true">←</span>
        AI Resources
      </Link>
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        Useful Prompts
      </h1>
      <PromptsContent />
    </div>
  );
}
