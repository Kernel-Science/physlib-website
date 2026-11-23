import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AiGuidelinesContent } from "../ai-guidelines/content";
import { PhyslibAiToolsContent } from "../physlib-ai-tools/content";
import { PromptsContent } from "../prompts/content";

export const metadata: Metadata = {
  title: "AI Resources",
  description: "Physlib’s AI contribution guidelines, companion tooling, and prompt library.",
};

export default function AiResourcesPage() {
  return (
    <div className="page-frame-editorial max-w-5xl">
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">AI Resources</h1>
      <p className="page-intro-editorial mb-8 max-w-2xl">
        Read Physlib’s AI contribution guidelines and browse the tools and prompts below.
        When you’re ready to submit a change, use the{" "}
        <Link href="/gh-guide#make-a-pull-request" className="text-accent hover:underline underline-offset-2">
          GitHub Guide
        </Link>.
      </p>
      <div className="space-y-12">
        <section>
          <PageHeader id="ai-guidelines" title="AI Guidelines" />
          <AiGuidelinesContent headingLevel={3} />
        </section>
        <section>
          <PageHeader id="physlib-ai-tools" title="Physlib AI Tools" />
          <PhyslibAiToolsContent headingLevel={3} guidelinesHref="#ai-guidelines" />
        </section>
        <section>
          <PageHeader id="useful-prompts" title="Useful Prompts" />
          <PromptsContent headingLevel={3} />
        </section>
      </div>
    </div>
  );
}
