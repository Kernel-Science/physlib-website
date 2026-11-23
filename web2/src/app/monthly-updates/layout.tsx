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
    <div className="page-frame-tracker">
      <h1 className="page-title-tracker">Monthly Updates</h1>
      <p className="page-intro-tracker mb-8 max-w-3xl">
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
        . This is currently a draft feature, so please give any feedback or improvement suggestions for this page.
      </p>

      {children}
    </div>
  );
}
