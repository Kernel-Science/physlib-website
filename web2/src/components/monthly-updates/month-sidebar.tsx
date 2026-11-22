"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { monthRange } from "@/lib/monthly-updates-range";

const months = monthRange();
const years = Array.from(new Set(months.map((m) => m.year)));

export function MonthSidebar() {
  const pathname = usePathname();
  const activeSlug = pathname.split("/").pop();

  return (
    <aside className="hidden w-52 shrink-0 lg:block pt-16">
      <nav className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-3 pl-6">
        {years.map((year) => (
          <div key={year} className="mb-6 last:mb-0">
            <p className="site-nav-heading">
              {year}
            </p>
            <ul className="flex flex-col">
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

        {/* Earlier months not included*/}
        <div className="mt-8 border-t border-border/60 px-2 pt-4">
          <p className="text-[11px] leading-relaxed text-muted/70">
            Earlier months are not included here.
          </p>
        </div>
      </nav>
    </aside>
  );
}
