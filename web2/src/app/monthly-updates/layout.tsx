import type { Metadata } from "next";
import { MobileMonthArchive } from "@/components/monthly-updates/month-sidebar";
import { getArchiveBounds } from "@/lib/monthly-updates-months";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "Monthly Updates", template: `%s · ${site.name}` },
  description:
    "Auto-generated monthly reports of new definitions, theorems, and lemmas added to Physlib.",
};

export default async function MonthlyUpdatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="page-frame-tracker">
      <p className="label-mono text-muted mb-5">About</p>
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
        . This is currently a draft feature, so please give any feedback or
        improvement suggestions for this page on the{" "}
        <a
          href={site.zulip}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          Physlib channel on Lean Zulip
        </a>
        .
      </p>

      <MobileMonthArchive bounds={await getArchiveBounds()} />
      {children}
    </div>
  );
}
