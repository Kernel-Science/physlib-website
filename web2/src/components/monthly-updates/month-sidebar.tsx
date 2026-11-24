"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { monthRange, type ArchiveBounds } from "@/lib/monthly-updates-range";

const ArchiveContext = createContext<ArchiveBounds | null>(null);

export function MonthArchiveProvider({
  bounds,
  children,
}: {
  bounds: ArchiveBounds | null;
  children: ReactNode;
}) {
  return <ArchiveContext.Provider value={bounds}>{children}</ArchiveContext.Provider>;
}

// Reports from before the archive's first month exist only as PDFs in
// public/monthly-updates/, starting with May 2024.
const FIRST_PDF_REPORT = "2024-05";

function earlierPdfReports(a: string | undefined, b: string | undefined) {
  const firstArchived = [a, b].filter(Boolean).sort()[0];
  if (!firstArchived) return [];
  const reports: { slug: string; label: string }[] = [];
  let [year, month] = FIRST_PDF_REPORT.split("-").map(Number);
  for (;;) {
    const slug = `${year}-${String(month).padStart(2, "0")}`;
    if (slug >= firstArchived) break;
    const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    reports.push({ slug, label });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return reports.reverse();
}

export function MonthSidebar() {
  const bounds = useContext(ArchiveContext);
  return (
    <aside className="hidden w-52 shrink-0 pt-16 lg:block">
      <nav aria-label="Monthly report archive" className="py-8 pr-3 pl-6">
        <ReportLinks bounds={bounds} />
      </nav>
    </aside>
  );
}

export function MobileMonthArchive({ bounds }: { bounds: ArchiveBounds | null }) {
  const pathname = usePathname();
  if (!bounds) return null;
  return (
    <details key={pathname} className="mb-6 rounded-lg border border-border px-3 lg:hidden">
      <summary className="cursor-pointer py-2 text-sm font-medium">Browse reports</summary>
      <nav aria-label="Monthly report archive" className="border-t border-border py-3">
        <ReportLinks bounds={bounds} />
      </nav>
    </details>
  );
}

function ReportLinks({ bounds }: { bounds: ArchiveBounds | null }) {
  const months = monthRange(bounds);
  const years = Array.from(new Set(months.map((m) => m.year)));
  const earlier = earlierPdfReports(months[months.length - 1]?.slug ?? months[0]?.slug, months[0]?.slug);
  const pathname = usePathname();
  const activeSlug = pathname.split("/").pop();

  return (
    <>
      {years.map((year) => (
        <div key={year} className="mb-6 last:mb-0">
          <p className="site-nav-heading">
            {year}
          </p>
          <ul className="grid grid-cols-2 lg:flex lg:flex-col">
            {months
              .filter((m) => m.year === year)
              .map((m) => {
                const isActive = m.slug === activeSlug;
                return (
                  <li key={m.slug}>
                    <Link
                      href={`/monthly-updates/${m.slug}`}
                      aria-current={isActive ? "page" : undefined}
                      className="site-nav-link site-sidebar-link px-2"
                    >
                      {m.monthName}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      {earlier.length > 0 && (
        <details className="group mt-8 border-t border-border/60 pt-4">
          <summary className="site-nav-heading mb-0 flex cursor-pointer list-none items-center justify-between gap-1 rounded-(--radius) py-1 hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="whitespace-nowrap">Earlier reports (PDF)</span>
            <svg aria-hidden="true" className="size-3 shrink-0 transition-transform duration-150 group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </summary>
          <ul className="mt-2 grid grid-cols-2 gap-x-1">
            {earlier.map((m) => (
              <li key={m.slug}>
                <a
                  href={`/monthly-updates/${m.slug}.pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-nav-link site-sidebar-link whitespace-nowrap px-2"
                >
                  {m.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
