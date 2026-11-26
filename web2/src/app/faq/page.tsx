import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contributor FAQ",
  description: "Common questions about making your first contribution to Physlib.",
};

const linkClass = "text-accent hover:underline underline-offset-2";
const repository = site.github;
const external = { target: "_blank", rel: "noopener noreferrer" };

export default function ContributorFaqPage() {
  return (
    <div className="page-frame-editorial">
      <p className="label-mono mb-5 text-muted">Learn</p>
      <h1 className="page-title-editorial mb-8">
        Contributor FAQ
      </h1>
      <div className="max-w-2xl space-y-8 text-sm leading-relaxed text-foreground/85">
        <section aria-labelledby="first-task">
          <PageHeader id="first-task" title="Can I contribute before learning Lean?" />
          <p>
            Yes. An API map explains the physics in Markdown and links to existing Lean
            declarations. Look for a topic you know in the{" "}
            <Link className={linkClass} href="/api-maps">API Maps</Link>
            {" "}and use the{" "}
            <a className={linkClass} href={`${repository}/blob/master/docs/API_MAP_GUIDE.md`} {...external}>
              API map writing guide
            </a>
            {" "}to get started.
          </p>
        </section>
        <section aria-labelledby="github-account">
          <PageHeader id="github-account" title="When do I need a GitHub account?" />
          <p>
            You can read the repository, clone it, and draft locally without signing in.
            You need an account to create a fork and open a pull request. Follow the{" "}
            <Link className={linkClass} href="/gh-guide">GitHub guide</Link>
            {" "}when you are ready to submit.
          </p>
        </section>
        <section aria-labelledby="push-permissions">
          <PageHeader id="push-permissions" title="Why does GitHub reject my push?" />
          <p>
            Run <code>git remote -v</code> to see where Git sends your changes.
            Push to the fork under your GitHub username and verify that Git is using
            the account that owns the fork. See the{" "}
            <a className={linkClass} href={`${repository}/blob/master/CONTRIBUTING.md`} {...external}>
              contribution guide
            </a>
            {" "}for the local editing and submission workflow.
          </p>
        </section>
        <section aria-labelledby="checks">
          <PageHeader id="checks" title="What should I check before submitting?" />
          <p>
            For an API map, use the lint command in the writing guide and check
            the rendered Markdown and declaration links. For Lean changes, see{" "}
            <Link className={linkClass} href="/getting-started#linting">Linting</Link>
            {" "}for the local commands used to check the code.
          </p>
        </section>
        <section aria-labelledby="help">
          <PageHeader id="help" title="Where can I ask for help?" />
          <p>
            Ask in the{" "}
            <a className={linkClass} href={site.zulip} {...external}>
              Physlib channel on Lean Zulip
            </a>
            . Include the topic or command you were working on and any relevant error output.
          </p>
        </section>
      </div>
    </div>
  );
}
