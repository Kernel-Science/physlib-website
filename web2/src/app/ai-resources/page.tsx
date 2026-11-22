import type { Metadata } from "next";
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
      <h1 className="page-title-editorial">AI Resources</h1>
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
