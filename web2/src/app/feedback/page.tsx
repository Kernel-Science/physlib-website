import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Share how you use Physlib or suggest what the library could do better.",
};

const modes = [
  { mode: "experience", label: "Share an experience" },
  { mode: "suggestion", label: "General feedback" },
] as const;

export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const { type } = await searchParams;
  const active = type === "suggestion" ? "suggestion" : "experience";
  return (
    <div className="page-frame-editorial">
      <h1 className="page-title-editorial">Feedback</h1>
      <nav aria-label="Feedback type" className="mt-6 inline-grid max-w-full grid-cols-2 gap-1 rounded-lg border border-border bg-surface-secondary/40 p-1">
        {modes.map(({ mode, label }) => (
          <Link key={mode} href={`/feedback?type=${mode}`} scroll={false}
            aria-current={active === mode ? "page" : undefined}
            className={`flex min-h-10 items-center justify-center rounded-(--radius) px-3 py-2 text-center text-sm font-medium sm:px-5 ${active === mode ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="grid min-w-0 max-w-[44rem]">
        {modes.map(({ mode }) => (
          <div key={mode} inert={active !== mode} aria-hidden={active !== mode}
            className={`col-start-1 row-start-1 flex min-w-0 flex-col ${active !== mode ? "invisible" : ""}`}>
            <FeedbackForm mode={mode} />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Want to review pull requests?{" "}
              <a href={site.github + "/issues/new?template=ReviewWillingness.yml"} className="text-accent underline underline-offset-2">
                Sign up as a reviewer on GitHub
              </a>.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
