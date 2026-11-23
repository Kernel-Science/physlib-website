import type { Metadata } from "next";
import { PromptsContent } from "./content";

export const metadata: Metadata = {
  title: "Useful Prompts | Physlib",
  description:
    "Ready-made prompts for common Physlib tasks, filled in with the Lean subfolder you're working on.",
};

export default function PromptsPage() {
  return (
    <div className="page-frame-editorial max-w-5xl">
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        Useful Prompts
      </h1>
      <PromptsContent />
    </div>
  );
}
