import { Card } from "@heroui/react";
import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/button-link";
import { InstallChoice, InstallSteps, type InstallStep } from "@/components/install-steps";

export const metadata: Metadata = {
  title: "Getting Started",
  description:
    "Set up Lean and Physlib, write your first results, and check them with the project’s linters.",
};

export default function GettingStartedPage() {
  return (
    <div className="page-frame-editorial">

      {/* Page intro */}
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        Getting Started
      </h1>
      <p className="page-intro-editorial max-w-2xl mb-10">
        Set up Lean and Physlib, then write and check your first Lean results. Start here if
        you’re new to Lean or to the project. If you’re still deciding how to help, see{" "}
        <Link href="/get-involved" className="text-accent hover:underline underline-offset-2">Ways to Contribute</Link>.
      </p>

      <PageHeader id="first-contribution" title="Make Your First Contribution" />
      <p className="mb-4 text-sm leading-relaxed text-foreground/85">
        If you know the physics and are new to Lean, you can write a Wiki article
        explaining a topic and linking to its Lean declarations. The{" "}
        <a href="https://github.com/leanprover-community/physlib/blob/master/docs/GettingStarted/FirstAPIMap.md" className="text-accent hover:underline">
          article walkthrough
        </a>{" "}
        shows how to draft and check one.
      </p>
      <div className="mb-12 flex flex-wrap gap-3">
        <ButtonLink href="/wiki/new">
          Write your first Wiki article
        </ButtonLink>
        <ButtonLink href="/gh-guide" variant="secondary">
          GitHub Guide
        </ButtonLink>
        <ButtonLink href="/faq" variant="secondary">
          Contributor FAQ
        </ButtonLink>
      </div>

      {/* Installation */}
      <header id="installing" className="mb-6 scroll-mt-24">
        <h2
          className="text-3xl font-medium text-foreground"
          style={{ letterSpacing: "-0.04em" }}
        >
          Install Physlib
        </h2>
        <p className="mt-2 text-base text-muted leading-snug max-w-2xl" style={{ letterSpacing: "-0.01em" }}>
          Physlib is written in Lean. The easiest way to use it is through VS Code
          and the official Lean 4 extension. Tick each step off as you go.
        </p>
      </header>

      <InstallSteps steps={installSteps} />

      <details className="group mt-4 mb-14 rounded border border-border bg-background px-5 py-4 text-sm">
        <summary className="cursor-pointer select-none font-medium text-foreground">
          Something went wrong?
        </summary>
        <div className="mt-4 flex flex-col gap-3 text-foreground/85">
          <p>
            Sometimes things go wrong due to no fault of your own. Physlib or
            one of its dependencies may have been updated to a new version of
            Lean. In these cases, run the following in the top-level Physlib
            directory:
          </p>
          <CodeBlock language="bash" code={`rm -rf .lake\nlake update\nlake exe get_cache\nlake build`} />
          <p>Or as a single command:</p>
          <CodeBlock language="bash" code={`rm -rf .lake; lake update; lake exe get_cache; lake build`} />
        </div>
      </details>

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

      {/* About Lean */}
      <PageHeader id="about-lean" title="About Lean" />
      <div className="grid gap-10 md:grid-cols-2 md:items-center mb-4">
        <div>
          <h3
            className="text-2xl font-medium text-foreground leading-tight"
            style={{ letterSpacing: "-0.04em" }}
          >
            A theorem prover that guarantees correctness.
          </h3>
          <p
            className="mt-5 text-base text-muted leading-snug"
            style={{ letterSpacing: "-0.01em" }}
          >
            Lean is an interactive theorem prover where you write mathematical
            definitions, theorems, and proofs — and the system verifies
            correctness using type theory, with no gaps or hand-waving.
          </p>
          <p
            className="mt-4 text-base text-foreground/40 leading-snug"
            style={{ letterSpacing: "-0.01em" }}
          >
            Increasingly used by AI labs and mathematicians, Lean is now
            making its way into physics through Physlib.
          </p>
        </div>

        {/* Code card */}
        <div className="rounded overflow-hidden bg-background border border-border shadow-together">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-foreground/5">
            <span className="size-2.5 rounded-full bg-red-400/60" />
            <span className="size-2.5 rounded-full bg-yellow-400/60" />
            <span className="size-2.5 rounded-full bg-green-400/60" />
            <span className="ml-3 text-xs text-foreground/30 font-mono">WicksTheorem.lean</span>
          </div>
          <div className="bg-[#1e1e1e] p-4 md:p-5 text-[13px] font-mono text-[#d4d4d4] leading-relaxed">
            <pre className="whitespace-pre-wrap break-words">
              <code>
                <span className="text-[color:var(--brand-blue-on-dark)]">theorem</span> <span className="text-[color:var(--brand-blue-tint)]">wicks_theorem</span> : (φs : <span className="text-[#4ec9b0]">List</span> 𝓕.FieldOp) → 𝓣(<span className="text-[color:var(--brand-blue-tint)]">ofFieldOpList</span> φs) ={"\n"}
                {"  "}∑ (φsΛ : <span className="text-[#4ec9b0]">WickContraction</span> φs.length), φsΛ.wickTerm{"\n"}
                | [] <span className="text-[color:var(--brand-blue-on-dark)]">=&gt;</span> <span className="text-[color:var(--brand-blue-on-dark)]">by</span>{"\n"}
                {"  "}<span className="text-[color:var(--brand-blue-tint)]">rw</span> [timeOrder_ofFieldOpList_nil]{"\n"}
                {"  "}<span className="text-[color:var(--brand-blue-tint)]">simp</span> <span className="text-[color:var(--brand-blue-on-dark)]">only</span> [map_one, <span className="text-[#4ec9b0]">List</span>.length_nil, <span className="text-[#4ec9b0]">Algebra</span>.smul_mul_assoc]{"\n"}
                {"  "}<span className="text-[color:var(--brand-blue-tint)]">rw</span> [sum_WickContraction_nil]{"\n"}
                {"  "}<span className="text-[color:var(--brand-blue-tint)]">simp</span> <span className="text-[color:var(--brand-blue-on-dark)]">only</span> [wickTerm_empty_nil]{"\n"}
                | φ :: φs <span className="text-[color:var(--brand-blue-on-dark)]">=&gt;</span> <span className="text-[color:var(--brand-blue-on-dark)]">by</span>
              </code>
            </pre>
          </div>
          <div className="px-4 py-2.5 text-xs text-foreground/30 font-mono border-t border-border">
            Wick&apos;s theorem — formally verified in Physlib.
          </div>
        </div>
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
          yourself to the author list, in alphabetical order by last name.
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
        Keep related results together. When a contribution needs its own module,
        put it beside files on the same physics topic.
      </p>

      <Card variant="default" className="mb-4">
        <Card.Header>
          <Card.Title>Try a PhyslibAlpha Module</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-4 text-sm text-foreground/90">
          <p>
            Create <code className="break-all">PhyslibAlpha/Particles/StandardModel/GaugeGroup/PhaseProduct.lean</code>{" "}
            in your local copy of Physlib. Paste the example below and replace
            “Your Name” in the header. The lemma shows that composing two gauge
            transformations multiplies their U(1) phases.
          </p>
          <CodeBlock language="lean" title="PhaseProduct.lean" code={alphaFileExample} />
          <p>
            Register the module in <code>PhyslibAlpha.lean</code> by adding this
            line in alphabetical order among the existing imports. Each dot in
            the module name corresponds to a folder separator in the file path.
          </p>
          <CodeBlock
            language="lean"
            title="PhyslibAlpha.lean"
            code="public import PhyslibAlpha.Particles.StandardModel.GaugeGroup.PhaseProduct"
          />
          <p>
            From the root of your Physlib checkout, build the new module.
            Lake checks the imports and the proof.
          </p>
          <CodeBlock
            language="bash"
            code="lake build PhyslibAlpha.Particles.StandardModel.GaugeGroup.PhaseProduct"
          />
          <p>
            Use <code>Physlib.lean</code> to register modules under <code>Physlib/</code>.
            The <Link className={linkClass} href="/documentation-guide">Documentation Guide</Link>{" "}
            explains the section headings for a contribution, and the{" "}
            <a className={linkClass} href="https://github.com/leanprover-community/physlib/blob/master/docs/ContributionHandbook/Documentation.md#module-documentation-structure" target="_blank" rel="noopener noreferrer">contribution handbook</a>{" "}
            gives the full rules.
          </p>
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
        On making a pull request to Physlib, GitHub workflows will lint your
        code automatically. You can also check locally:
      </p>

      <Card variant="default" className="mb-4">
        <Card.Header>
          <Card.Title>Linting Locally</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 text-sm text-foreground/90">
          <CodeBlock language="bash" code={`lake exe lint_all\n./scripts/lint/required/lint-style.sh`} />
          <p className="text-muted text-xs">
            A pull request must pass both before it can be merged. Commit your changes
            before running <code className="font-mono">lint-style.sh</code>, and expect to
            run <code className="font-mono">lint_all</code> more than once. The{" "}
            <a className={linkClass} href="https://github.com/leanprover-community/physlib/blob/master/scripts/README.md#linting-physlib" target="_blank" rel="noopener noreferrer">
              scripts README
            </a>{" "}
            describes every linter.
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
      { label: "Make Your First Contribution", href: "#first-contribution" },
      { label: "Install Physlib", href: "#installing" },
      { label: "About Lean", href: "#about-lean" },
      { label: "Useful Resources", href: "#useful-resources" },
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

const linkClass = "text-accent hover:underline underline-offset-2";

const installSteps: InstallStep[] = [
  {
    id: "vscode",
    title: "Install VS Code",
    body: (
      <>
        <p>VS Code is a lightweight code editor, and the recommended way to work with Lean.</p>
        <div>
          <ButtonLink href="https://code.visualstudio.com/">Install VS Code</ButtonLink>
        </div>
      </>
    ),
  },
  {
    id: "extension",
    title: "Install the Lean 4 extension",
    body: (
      <>
        <p>
          The official Lean 4 extension opens directly in VS Code. You can also get it from the{" "}
          <a href="https://marketplace.visualstudio.com/items?itemName=leanprover.lean4" target="_blank" rel="noopener noreferrer" className={linkClass}>
            VS Code Marketplace
          </a>.
        </p>
        <div>
          <ButtonLink href="vscode:extension/leanprover.lean4" external target="_self">
            Get the extension
          </ButtonLink>
        </div>
      </>
    ),
  },
  {
    id: "setup",
    title: "Install Lean",
    body: (
      <>
        <p>
          Open the extension&apos;s setup guide and click its <span className="font-medium">Install Lean</span>{" "}
          button. This installs elan, Lean&apos;s version manager, together with Git (and curl on
          Linux). You can skip the guide&apos;s other steps, which are about creating new projects.
        </p>
        <div>
          <ButtonLink href="vscode://leanprover.lean4/setup-guide" external target="_self">
            Open setup guide
          </ButtonLink>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-muted hover:text-foreground transition-colors">
            If VS Code has not opened automatically
          </summary>
          <ol className="mt-3 ml-5 list-decimal space-y-1.5">
            <li>Open VS Code.</li>
            <li>
              Create a new empty file with <span className="font-medium">File › New Text File</span>{" "}
              (<kbd className="font-mono text-xs">Ctrl+N</kbd> / <kbd className="font-mono text-xs">Cmd+N</kbd>).
            </li>
            <li>Click the <span className="font-mono">∀</span> symbol at the top right of the window.</li>
            <li>
              Select <span className="font-medium">Documentation › Docs: Show Setup Guide…</span>
            </li>
          </ol>
        </details>
        <p className="text-muted text-xs">
          You don&apos;t need to pick a Lean version. Physlib pins its own, and elan downloads it
          the first time you build.
        </p>
      </>
    ),
  },
  {
    id: "physlib",
    title: "Get a copy of Physlib",
    body: (
      <>
        <InstallChoice
          options={[
            {
              label: "I want to contribute",
              content: (
                <>
                  <p>
                    Contributions reach Physlib through a fork, your own copy of the repository on
                    GitHub. Sign in to GitHub, fork Physlib, then clone your fork. Replace{" "}
                    <code className="font-mono">YOUR-USERNAME</code> with your GitHub username.
                  </p>
                  <div>
                    <ButtonLink href="https://github.com/leanprover-community/physlib/fork">
                      Fork on GitHub
                    </ButtonLink>
                  </div>
                  <CodeBlock
                    language="bash"
                    code={`git clone https://github.com/YOUR-USERNAME/physlib.git\ncd physlib\ngit remote add upstream https://github.com/leanprover-community/physlib.git\nlake exe get_cache\nlake build`}
                  />
                  <p className="text-muted text-xs">
                    The <code className="font-mono">upstream</code> remote lets you pull in the latest
                    changes from Physlib. See the{" "}
                    <Link href="/gh-guide" className={linkClass}>GitHub Guide</Link> for branches and pull
                    requests.
                  </p>
                </>
              ),
            },
            {
              label: "I just want to explore",
              content: (
                <>
                  <p>
                    Clone{" "}
                    <a href="https://github.com/leanprover-community/physlib" target="_blank" rel="noopener noreferrer" className={linkClass}>
                      the repository
                    </a>{" "}
                    directly. You can fork later if you decide to contribute.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`git clone https://github.com/leanprover-community/physlib.git\ncd physlib\nlake exe get_cache\nlake build`}
                  />
                </>
              ),
            },
          ]}
        />
        <p className="text-muted text-xs">
          Run these in a terminal (VS Code has one under{" "}
          <span className="font-medium">Terminal › New Terminal</span>). <code className="font-mono">get_cache</code>{" "}
          downloads pre-built files, so the build takes minutes instead of much longer. If it
          fails, <code className="font-mono">lake build</code> still works, just slowly.
        </p>
        <details className="text-sm">
          <summary className="cursor-pointer select-none text-muted hover:text-foreground transition-colors">
            &quot;git: command not found&quot;?
          </summary>
          <p className="mt-3">
            Git is installed in Step 3, so first restart your terminal and check with{" "}
            <code className="font-mono">git --version</code>. If it is still missing, install it
            from{" "}
            <a href="https://git-scm.com/downloads" target="_blank" rel="noopener noreferrer" className={linkClass}>
              git-scm.com
            </a>
            .
          </p>
        </details>
      </>
    ),
  },
  {
    id: "open",
    title: "Open Physlib in VS Code",
    body: (
      <p>
        Use <span className="font-medium">File › Open Folder…</span> and choose the{" "}
        <code className="font-mono">physlib</code> folder. Open the whole folder, not a single file, so
        Lean can find Physlib and Mathlib.
      </p>
    ),
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
      "Definitions are used to introduce new concepts or objects in a precise and formal way. In Physlib we give all definitions docstrings.",
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
      "Informal definitions are definitions written in English rather than in Lean. They are given a tag (you can get a tag using lake exe make_tag), and a list of dependencies. The definition itself is written in the docstring. They cannot be used in further results.",
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
      "Informal lemmas are lemmas written in English rather than in Lean. They are given a tag and a list of dependencies. The lemma and its proof are written in the docstring. They cannot be used in further results.",
    code: `/-- The time evolution of the hubble parameter is equal to \`dₜ H = - H^2 (1 + q)\`. -/
informal_lemma time_evolution_hubbleConstant where
  deps := [\`\`hubbleConstant]
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
      "TODO items are used to indicate things which are to be done. They consist of a tag and a string statement of what is to be done.",
    code: `TODO "6VZHC" "Create a new folder for the damped harmonic oscillator, initially as a place-holder."`,
  },
];

const alphaFileExample = `/-
Copyright (c) 2026 Your Name. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Your Name
-/
module

public import Physlib.Particles.StandardModel.GaugeGroup.Basic

/-!
# The U(1) phase of a product

Project a Standard Model gauge transformation onto its U(1) factor.

## i. Overview

An element of the unquotiented gauge group has three components,
in SU(3), SU(2) and U(1). The projection to U(1) is a homomorphism.

## ii. Key results

- \`toU1_mul\` gives the phase of a product of gauge transformations.

## iii. Table of contents

- A. Composition

## iv. References

* None.
-/

public section

namespace StandardModel.GaugeGroupI

/-!
## A. Composition
-/

/-- Composing two transformations multiplies their U(1) phases. -/
lemma toU1_mul (g h : StandardModel.GaugeGroupI) :
    toU1 (g * h) = toU1 g * toU1 h :=
  toU1.map_mul g h

end StandardModel.GaugeGroupI`;
