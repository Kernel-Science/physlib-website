import { Card } from "@heroui/react";
import type { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/button-link";

export const metadata: Metadata = {
  title: "Getting Started | Physlib",
  description:
    "A guide for getting started with Physlib, aimed at people with no Lean experience or who are new to the project.",
};

export default function GettingStartedPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">

      {/* Page intro */}
      <p className="label-mono text-muted mb-5">Documentation</p>
      <h1
        className="text-4xl font-medium text-foreground mb-4 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        Getting Started
      </h1>
      <p
        className="text-lg text-muted max-w-2xl mb-10 leading-snug"
        style={{ letterSpacing: "-0.01em", lineHeight: 1.4 }}
      >
        A guide for getting started with Physlib, aimed at people with no Lean
        experience or who are new to the project.
      </p>

      {/* In-page navigation */}
      <div className="mb-12 grid gap-6 sm:grid-cols-3 border-b border-border pb-10">
        {tocSections.map((section) => (
          <div key={section.title}>
            <p className="label-mono text-foreground/40 mb-3">{section.title}</p>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-accent hover:underline underline-offset-2"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Useful Resources */}
      <PageHeader id="useful-resources" title="Useful Resources" />
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        {resources.map((r, i) => (
          <a
            key={i}
            href={r.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded border border-border bg-background px-5 py-4 text-sm hover:bg-foreground/5 transition-colors shadow-together"
          >
            <span className="label-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-medium flex-1" style={{ letterSpacing: "-0.01em" }}>{r.label}</span>
            <span className="text-muted text-xs group-hover:text-foreground transition-colors">↗</span>
          </a>
        ))}
      </div>

      {/* Installing */}
      <PageHeader id="installing" title="Installing" />

      <Card variant="default" className="mb-4">
        <Card.Header>
          <Card.Title>Lean Installation</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3">
          <p className="text-sm text-foreground/90">
            Ready to get started with Lean? Click the button below to see the
            official installation instructions.
          </p>
          <div>
            <ButtonLink href="https://docs.lean-lang.org/lean4/doc/quickstart.html" size="sm">
              Install Lean
            </ButtonLink>
          </div>
        </Card.Content>
      </Card>

      <Card variant="default" className="mb-4">
        <Card.Header>
          <Card.Title>Physlib Installation Steps</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 text-sm text-foreground/90">
          <ol className="list-decimal ml-5 space-y-2">
            <li>
              Clone the repository:{" "}
              <a
                href="https://github.com/leanprover-community/physlib"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline underline-offset-2"
              >
                github.com/leanprover-community/physlib
              </a>
            </li>
            <li>
              Run the following commands in the top-level Physlib directory:
            </li>
          </ol>
          <CodeBlock language="bash" code={`lake update\nlake exe cache get\nlake build`} />
          <p className="text-muted text-xs">
            Note: <code className="font-mono">lake build</code> may take around 20 minutes.
          </p>
        </Card.Content>
      </Card>

      <Card variant="default" className="mb-4">
        <Card.Header>
          <Card.Title>Troubleshooting</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 text-sm text-foreground/90">
          <p>
            Sometimes things go wrong due to no fault of your own — Physlib or
            one of its dependencies may have been updated to a new version of
            Lean. In these cases you can try:
          </p>
          <CodeBlock language="bash" code={`rm -rf .lake\nlake update\nlake exe cache get\nlake build`} />
          <p>Or as a single command:</p>
          <CodeBlock language="bash" code={`rm -rf .lake; lake update; lake exe cache get; lake build`} />
        </Card.Content>
      </Card>

      {/* Writing Results */}
      <PageHeader id="writing-results" title="Writing Results" />

      <p className="text-sm text-muted mb-4 leading-relaxed" style={{ letterSpacing: "-0.01em" }}>
        Things to bear in mind:
      </p>
      <ul className="text-sm text-foreground/85 space-y-2 mb-8 ml-4">
        <li className="flex gap-3">
          <span className="text-accent flex-shrink-0">—</span>
          It helps if results sit next to results about the same physics.
        </li>
        <li className="flex gap-3">
          <span className="text-accent flex-shrink-0">—</span>
          Informal results and semi-formal results are easier to write if
          you&apos;re new to Lean.
        </li>
        <li className="flex gap-3">
          <span className="text-accent flex-shrink-0">—</span>
          If you make substantial changes to a file, feel free to add
          yourself to the author list, in alphabetic order by last name.
        </li>
      </ul>

      <div className="flex flex-col gap-4">
        {resultTypes.map((rt) => (
          <Card key={rt.title} variant="default">
            <Card.Header>
              <Card.Title>{rt.title}</Card.Title>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3 text-sm text-foreground/90">
              <p>{rt.description}</p>
              <CodeBlock language="lean" code={rt.code} />
              {rt.footer && <p className="text-muted text-xs">{rt.footer}</p>}
            </Card.Content>
          </Card>
        ))}
      </div>

      {/* Making a New File */}
      <PageHeader id="making-a-new-file" title="Making a New File" />

      <p className="text-sm text-muted mb-6 leading-relaxed" style={{ letterSpacing: "-0.01em" }}>
        New files should be made when there is a natural separation of results
        in an existing file, or when a new result is being added that does not
        fit in any existing file.
      </p>

      <Card variant="default" className="mb-4">
        <Card.Header>
          <Card.Title>New File Checklist</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 text-sm text-foreground/90">
          {fileSteps.map((step, i) => (
            <div key={i} className="flex flex-col gap-2">
              <p>
                <strong>{step.title}:</strong> {step.description}
              </p>
              {step.code && <CodeBlock language="lean" code={step.code} />}
            </div>
          ))}
        </Card.Content>
      </Card>

      {/* Linting */}
      <PageHeader id="linting" title="Linting" />

      <p className="text-sm text-foreground/85 mb-4 leading-relaxed" style={{ letterSpacing: "-0.01em" }}>
        Linting is the process of checking your code for potential errors,
        stylistic issues, and adherence to coding standards. It helps ensure
        that your code is clean, consistent, and free from common mistakes.
      </p>
      <p className="text-sm text-muted mb-6 leading-relaxed" style={{ letterSpacing: "-0.01em" }}>
        On making a pull-request to Physlib, GitHub workflows will lint your
        code automatically. You can also check locally:
      </p>

      <Card variant="default" className="mb-4">
        <Card.Header>
          <Card.Title>Linting Locally</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 text-sm text-foreground/90">
          <CodeBlock language="bash" code={`lake exe lint_all\n./scripts/lint-style.sh`} />
          <p className="text-muted text-xs">
            Ensuring these commands produce no errors helps maintain the quality
            of Physlib.
          </p>
        </Card.Content>
      </Card>

    </div>
  );
}

const tocSections = [
  {
    title: "Getting Started",
    links: [
      { label: "Useful Resources", href: "#useful-resources" },
      { label: "Installation Guide", href: "#installing" },
    ],
  },
  {
    title: "Writing",
    links: [
      { label: "Writing Results", href: "#writing-results" },
      { label: "Making a New File", href: "#making-a-new-file" },
    ],
  },
  {
    title: "Code Quality",
    links: [
      { label: "Linting", href: "#linting" },
    ],
  },
];

const resources = [
  {
    label: "The Natural Numbers Game",
    href: "https://adam.math.hhu.de",
  },
  {
    label: "Lean for Scientists and Engineers — Tyler Josephson",
    href: "https://www.youtube.com/watch?v=s9Dyiu4S4vA",
  },
];

const resultTypes = [
  {
    title: "Definitions",
    description:
      "Definitions are used to introduce new concepts or objects in a precise and formal way. In Physlib we give all definitions doc-strings.",
    code: `/-- For a harmonic oscillator, the Schrodinger Operator corresponding to it
is defined as the function from \`ℝ → ℂ\` to \`ℝ → ℂ\` taking

\`ψ ↦ - ℏ^2 / (2 * m) * ψ'' + 1/2 * m * ω^2 * x^2 * ψ\`. -/
noncomputable def schrodingerOperator (ψ : ℝ → ℂ) : ℝ → ℂ :=
    fun x => - Q.ℏ ^ 2 / (2 * Q.m) * (deriv (deriv ψ) x) + 1/2 * Q.m * Q.ω^2 * x^2 * ψ x`,
    footer: "structure, inductive and abbrev also introduce new concepts in a similar way to def.",
  },
  {
    title: "Lemmas",
    description:
      "In Physlib we use lemmas for every theorem which is not a main one. For every lemma you must provide a proof.",
    code: `lemma schrodingerOperator_parity (ψ : ℝ → ℂ) :
    Q.schrodingerOperator (parity ψ) = parity (Q.schrodingerOperator ψ) := by
  funext x
  have (ψ : ℝ → ℂ) : (fun x => (deriv fun x => ψ (-x)) x) = fun x => - deriv ψ (-x) := by
    funext x
    rw [← deriv_comp_neg]
  simp [schrodingerOperator, parity, this]`,
  },
  {
    title: "Theorems",
    description:
      "Theorems are significant results, but are otherwise exactly the same as lemmas.",
    code: `theorem wicks_theorem_normal_order : (φs : List 𝓕.FieldOp) →
    𝓣(𝓝(ofFieldOpList φs)) =
    ∑ (φsΛ : {φsΛ : WickContraction φs.length // ¬ HaveEqTime φsΛ}), φsΛ.1.wickTerm := by
  ...`,
  },
  {
    title: "Informal Definitions",
    description:
      "Informal definitions are definitions written in English rather than in Lean. They are given a tag (you can get a tag using lake exe make_tag), and a list of dependencies. The definition itself is written in the doc-string. They cannot be used in further results.",
    code: `/-- The hubble constant defined in terms of the scale factor
as \`(dₜ a) / a\`.

The notation \`H\` is used for the \`hubbleConstant\`. -/
informal_definition hubbleConstant where
  deps := []
  tag := "6Z2NB"`,
  },
  {
    title: "Informal Lemmas",
    description:
      "Informal lemmas are lemmas written in English rather than in Lean. They are given a tag and a list of dependencies. The lemma and proof itself are written in the doc-string. They cannot be used in further results.",
    code: `/-- The time evolution of the hubble parameter is equal to \`dₜ H = - H^2 (1 + q)\`. -/
informal_lemma time_evolution_hubbleConstant where
  deps := [hubbleConstant]
  tag := "6Z3BS"`,
  },
  {
    title: "Semi-Formal Results",
    description:
      "Semi-formal results are like informal definitions and lemmas except the type of the definition or statement of the lemma is made formal. They are half-way between informal and formal statements. They cannot be used in further results and are also given a tag.",
    code: `/-- The force on the classical harmonic oscillator is \`- k x\`. -/
semiformal_result "6YB2U" force_is_linear (x : ℝ → ℝ) :
  force S x = - S.k • x`,
  },
  {
    title: "TODO Items",
    description:
      "Todo items are used to indicate things which are to be done. They consist of a tag and a string statement of what is to be done.",
    code: `TODO "6VZHC" "Create a new folder for the damped harmonic oscillator, initially as a place-holder."`,
  },
];

const fileSteps = [
  {
    title: "Create a new file",
    description: "Place the file in the relevant directory.",
  },
  {
    title: "File naming convention",
    description:
      "Use a descriptive name with only alphabetic characters. Each new word should start with a capital letter, e.g. MyNewFile.lean.",
  },
  {
    title: "Add a copyright statement",
    description: "At the very top of the file, include:",
    code: `/-
Copyright (c) 2025 your-name. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: your-name
-/`,
  },
  {
    title: "Include necessary imports",
    description: "Add any required imports next, for example:",
    code: `import Mathlib.Analysis.SpecialFunctions.Integrals
import Mathlib.Analysis.SpecialFunctions.PolarCoord
import PhysLean.Meta.TODO.Basic
import PhysLean.Meta.Informal.SemiFormal
import PhysLean.Meta.Informal.Basic`,
  },
  {
    title: "Add a file description",
    description: "Provide a brief description of the file's content.",
  },
  {
    title: "Update the main import file",
    description:
      "Add your new file to ./PhysLean.lean (or the main entry file) in alphabetical order as an import.",
  },
];
