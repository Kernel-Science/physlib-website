"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "@/lib/site";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 lg:block pt-16">
      <nav className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-8">
        <ul className="flex flex-col gap-7">
          {navSections.map((section) => (
            <li key={section.label}>
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
                {section.label}
              </p>
              <ul className="flex flex-col">
                {section.items.map((item) => {
                  const isActive =
                    !item.external &&
                    (item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="site-nav-link site-sidebar-link items-center justify-between px-2"
                        >
                          {item.label}
                          <ExternalIcon />
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className="site-nav-link site-sidebar-link px-2"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden
      className="size-3 opacity-40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 4h6v6M20 4l-9 9M9 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4"
      />
    </svg>
  );
}
