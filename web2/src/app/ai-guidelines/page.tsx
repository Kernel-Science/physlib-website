import type { Metadata } from "next";
import { AiGuidelinesContent } from "./content";

export const metadata: Metadata = {
  title: "AI Guidelines | Physlib",
  description:
    "Guidelines for using AI tools when contributing to Physlib.",
};

export default function AiGuidelinesPage() {
  return (
    <div className="page-frame-editorial">
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        AI Guidelines
      </h1>
      <AiGuidelinesContent />
    </div>
  );
}
