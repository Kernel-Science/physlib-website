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
      <nav className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-8">
        {years.map((year) => (
          <div key={year} className="mb-6 last:mb-0">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
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
                        className={`flex items-center rounded-lg px-2 py-1.5 text-sm transition-colors ${
                          isActive
                            ? "text-accent font-medium"
                            : "text-muted hover:text-foreground"
                        }`}
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {isActive && (
                          <span className="mr-2 size-1 rounded-full bg-accent flex-shrink-0" />
                        )}
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
            Earlier months are not included here as they did not follow Physlib&apos;s current code standards
          </p>
        </div>
      </nav>
    </aside>
  );
}
