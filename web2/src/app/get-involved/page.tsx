import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get Involved | Physlib",
  description:
    "Many ways to contribute to Physlib — from promoting the project to formalizing physics results in Lean.",
};

type Step = {
  title: string;
  body: string;
  href?: string;
  linkLabel?: string;
};

const steps: Step[] = [
  {
    title: "Promotion",
    body: "The easiest way to contribute is to promote the project, either by word of mouth or by sharing it on social media.",
  },
  {
    title: "The TODO List",
    body: "The TODO list contains basic Lean or admin related tasks. Most of these are relatively small tasks like renaming lemmas.",
    href: "/todo",
    linkLabel: "See TODOs",
  },
  {
    title: "Discuss",
    body: "There are a number of discussions on the Physlib Zulip, some of which contain questions you may be able to help with.",
    href: site.zulip,
    linkLabel: "See Physlib Zulip",
  },
  {
    title: "Help with Issues",
    body: "You can contribute by helping with open issues. These range from suggested formalizations, to infrastructure changes needed, to Lean meta programming tasks.",
    href: `${site.github}/issues`,
    linkLabel: "See Issues",
  },
  {
    title: "Contributing via GitHub",
    body: "A step-by-step guide to contributing to Physlib via GitHub.",
    href: "/gh-guide",
    linkLabel: "Read the Guide",
  },
  {
    title: "Golfing & Documentation",
    body: "Golfing is the process of making the code more concise and readable, whilst documentation is the process of adding comments and explanations to the code.",
  },
  {
    title: "Creating Informal Results",
    body: "If you have a background in physics and don't have the time or skills to formalize results into Lean, you can contribute by adding informal results — definitions and theorems — written in English, placed within the project.",
  },
  {
    title: "Help with a Project",
    body: "There is currently one GitHub project related to Physlib. Having a go at any of the items listed within that project would be a great way to get involved.",
    href: `${site.github}/projects?query=is%3Aopen`,
    linkLabel: "See Projects",
  },
  {
    title: "Start a Mini-Project",
    body: "There is a list of mini-projects on the Lean Zulip. If you want to get your teeth really stuck into formalizing physics, these are a great place for ideas.",
    href: "https://leanprover.zulipchat.com/#narrow/channel/479953-physlib/topic/Mini.20projects",
    linkLabel: "See Mini Projects",
  },
];

export default function GetInvolvedPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 sm:px-8 py-12 md:py-16">

      {/* Page intro */}
      <p className="label-mono text-muted mb-5">Community</p>
      <h1
        className="text-4xl font-medium text-foreground mb-4 md:text-5xl"
        style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
      >
        Get Involved
      </h1>
      <p
        className="text-lg text-muted max-w-2xl mb-6 leading-snug"
        style={{ letterSpacing: "-0.01em", lineHeight: 1.4 }}
      >
        Physlib is a community project and we welcome contributions from
        everyone. There are many ways to contribute — from helping with issues,
        to formalizing results, to creating informal results. Feel free to
        contribute in any way you see fit and think you will have the most fun from!
      </p>

      <div className="rounded border border-accent/30 bg-accent/10 px-5 py-3 text-sm mb-10" style={{ letterSpacing: "-0.01em" }}>
        <strong>New to Lean and Physlib?</strong> Check out our{" "}
        <a
          href="/getting-started"
          className="text-accent hover:underline underline-offset-2 font-medium"
        >
          getting started
        </a>{" "}
        page.
      </div>

      {/* Steps */}
      <div className="divide-y divide-border">
        {steps.map((step, i) => (
          <div key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-8 py-8 items-start">
            <span className="label-mono text-accent pt-0.5">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <h3
                className="text-lg font-medium text-foreground mb-2"
                style={{ letterSpacing: "-0.025em" }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm text-muted leading-relaxed mb-3"
                style={{ letterSpacing: "-0.01em" }}
              >
                {step.body}
              </p>
              {step.href && step.linkLabel && (
                <ButtonLink href={step.href} size="sm" variant="secondary">
                  {step.linkLabel}
                </ButtonLink>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 border-t border-border pt-10 text-center">
        <p className="label-mono text-foreground/35 mb-4">Questions?</p>
        <h2
          className="text-2xl font-medium text-foreground mb-3"
          style={{ letterSpacing: "-0.04em" }}
        >
          Need Help?
        </h2>
        <p
          className="text-sm text-muted mb-6 max-w-sm mx-auto leading-relaxed"
          style={{ letterSpacing: "-0.01em" }}
        >
          Join our community discussions or reach out for help on the Physlib
          channel within the Lean Zulip.
        </p>
        <ButtonLink href={site.zulip}>Join Discussion</ButtonLink>
      </div>
    </div>
  );
}
