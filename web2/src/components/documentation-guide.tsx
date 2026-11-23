import { DocumentationTrackerClient } from "@/app/documentation-tracker/documentation-tracker-client";

export function DocumentationGuide({ context = "tracker" }: { context?: "tracker" | "guide" }) {
  return (
    <div className="mt-10 flex min-w-0 flex-col gap-6 [&_code]:wrap-anywhere">
      <section>
        <h2 id="steps-to-help-with-documentation" className="text-xl font-semibold mb-3 scroll-mt-24">
          Steps to Help with Documentation
        </h2>
        <p className="text-sm text-muted mb-4">
          This whole process can be done without downloading Lean, but having
          it installed provides helpful tools.
        </p>

        {docSteps.map((step) => (
          <div key={step.title} id={context === "guide" ? slugify(step.title) : undefined} className="mb-6 scroll-mt-24">
            <h3 id={context === "tracker" ? slugify(step.title) : undefined} className="font-semibold mb-2 scroll-mt-24">
              {step.title}
            </h3>
            <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground/90">
              {step.items.map((item, i) => (
                <li key={i}>
                  {i === 0 && step.title === "Phase 2: Choose a File to Document" && context !== "tracker" ? (
                    <>
                      Choose a file from the <a href="/tasks?type=documentation" className="text-accent hover:underline">Documentation task list</a>, or select a red node in the <a href="#import-graph" className="text-accent hover:underline">import graph</a>.
                    </>
                  ) : (
                    <span dangerouslySetInnerHTML={{ __html: item }} />
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
      {context === "guide" && <DocumentationTrackerClient showFiles={false} />}
    </div>
  );
}

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const docSteps = [
  {
    title: "Phase 1: Get the Code",
    items: [
      'Fork the <a href="https://github.com/leanprover-community/physlib" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">physlib GitHub repository</a> (copy the master branch only).',
      "Clone your forked repository to your local machine. (Optional — you can also edit directly on GitHub.)",
    ],
  },
  {
    title: "Phase 2: Choose a File to Document",
    items: [
      "Choose a file from the list above, or select a red node in the import graph.",
      "In your local copy of physlib, open the file <code class='font-mono text-xs'>./scripts/lint/exemptions/module_doc_no_lint.txt</code>.",
      "Remove the line corresponding to the file you want to document.",
      "Navigate to the file you want to document.",
    ],
  },
  {
    title: "Phase 3: Write the Documentation",
    items: [
      "Add a title heading at the top of the file, starting with <code class='font-mono text-xs'># </code>.",
      "Add a <code class='font-mono text-xs'>## i. Overview</code> section explaining the physical content.",
      "Add a <code class='font-mono text-xs'>## ii. Key results</code> section listing key definitions, theorems, and lemmas.",
      "Add a <code class='font-mono text-xs'>## iii. Table of contents</code> section (can be left blank).",
      "Add a <code class='font-mono text-xs'>## iv. References</code> section for relevant literature.",
      "Organize the rest of the file with section and subsection headings.",
      "Alternatively, if you have Lean installed, run <code class='font-mono text-xs'>lake exe module_doc_lint</code>.",
    ],
  },
  {
    title: "Phase 4: Submit Your Changes",
    items: [
      "Commit your changes to your forked repository.",
      "Create a pull request to the main physlib repository for review.",
    ],
  },
];
