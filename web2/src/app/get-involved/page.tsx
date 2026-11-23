import type { Metadata } from "next";
import { WaysToContribute } from "./ways-to-contribute";
import Link from "next/link";
import { ButtonLink } from "@/components/button-link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ways to Contribute",
  description:
    "Many ways to contribute to Physlib — from promoting the project to formalizing physics results in Lean.",
};

export default function GetInvolvedPage() {
  return (
    <div className="page-frame-editorial">

      {/* Page intro */}
      <p className="label-mono text-muted mb-5">Learn</p>
      <h1 className="page-title-editorial">
        Ways to Contribute
      </h1>
      <p className="page-intro-editorial max-w-2xl mb-6">
        Choose a way to help that fits your background. You can write Lean code, explain
        existing results, record physics in plain English, or help the community.
      </p>

      <div className="rounded border border-accent/30 bg-accent/10 px-5 py-3 text-sm mb-10" style={{ letterSpacing: "-0.01em" }}>
        <strong>New to Lean and Physlib?</strong> Check out our{" "}
        <Link
          href="/getting-started"
          className="text-accent hover:underline underline-offset-2 font-medium"
        >
          Getting Started
        </Link>{" "}
        page, then follow the{" "}
        <Link href="/gh-guide" className="text-accent hover:underline underline-offset-2 font-medium">
          GitHub Guide
        </Link>{" "}
        when you are ready to submit a change. If you use AI tools, read the{" "}
        <Link href={site.aiResources} className="text-accent hover:underline underline-offset-2 font-medium">
          AI Resources
        </Link>{" "}
        first.
      </div>

      <WaysToContribute />

      {/* CTA */}
      <div className="mt-16 border-t border-border pt-10">
        <p className="label-mono text-foreground/35 mb-4">Questions?</p>
        <h2
          className="text-2xl font-medium text-foreground mb-3"
          style={{ letterSpacing: "-0.04em" }}
        >
          Need Help?
        </h2>
        <p
          className="text-sm text-muted mb-6 max-w-prose leading-relaxed"
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
