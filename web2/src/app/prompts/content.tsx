import { PageHeader } from "@/components/page-header";
import { SuggestNewPromptDialog } from "@/components/prompts/suggest-prompt-dialog";
import { PromptsClient } from "./prompts-client";
import { PreambleSection } from "./preamble-section";

export function PromptsContent({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  return (
    <>
      <p className="page-intro-editorial page-intro-tinted max-w-2xl mb-2">
        Here is a list of prompts ready for you to copy-paste into your agent, giving you a head-start when it comes to understanding the specific area of Physlib you are interested in. Enter one of these into your chat window to get started.
      </p>
      <p className="page-intro-editorial page-intro-tinted max-w-2xl mb-12">
        These prompts have all been added from the personal experiences of Physlib contributors. If you have any suggestions feel free to propose them on GitHub. This page has shortcuts for you to modify the source code directly.
      </p>

      <section className="mb-12">
        <PageHeader headingLevel={headingLevel} id="prompt-library" title="Prompt library" />
        <div className="mb-4 flex items-center justify-end">
          <SuggestNewPromptDialog />
        </div>
        <PromptsClient />
      </section>

      <section>
        <PageHeader headingLevel={headingLevel} id="about-the-preamble" title="About the preamble" />
        <PreambleSection />
      </section>
    </>
  );
}
