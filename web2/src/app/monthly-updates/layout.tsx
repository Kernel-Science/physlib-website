import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Monthly Updates | Physlib",
  description:
    "Auto-generated monthly reports of new definitions, theorems, and lemmas added to Physlib.",
};

export default function MonthlyUpdatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold tracking-tight mb-2">Monthly Updates</h1>
      <p className="text-muted mb-8 leading-relaxed max-w-3xl">
        A monthly changelog automatically generated on the 1st of each month
        from{" "}
        <a
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          leanprover-community/physlib
        </a>
        . Pick a month in the sidebar for a breakdown of contributors, new
        definitions, theorems and lemmas, and a link to the full report.
      </p>

      {children}
    </div>
  );
}
