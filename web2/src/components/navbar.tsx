"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef } from "react";
import { site, navSections, type NavItem, type NavSection } from "@/lib/site";
import { ThemeToggle } from "./theme-toggle";
import { GitHubIcon } from "@/components/monthly-updates/icons";

/** Does this item's route cover the current path? */
function covers(item: NavItem, pathname: string) {
  if (item.external) return false;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * The most specific matching item in a section. Nested routes mean several
 * items can cover one path — on /about/mission both "Overview" (/about) and
 * "Mission" match — so the longest href wins and only one item lights up.
 */
function activeHref(items: NavItem[], pathname: string) {
  let best: string | undefined;
  for (const item of items) {
    if (!covers(item, pathname)) continue;
    if (best === undefined || item.href.length > best.length) best = item.href;
  }
  return best;
}

function NavDropdown({ section, pathname }: { section: NavSection; pathname: string }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionActiveHref = activeHref(section.items, pathname);
  const isActive = sectionActiveHref !== undefined;

  function handleMouseEnter() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  }

  function handleMouseLeave() {
    timerRef.current = setTimeout(() => setOpen(false), 100);
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={`flex items-center gap-1 px-3 py-1.5 text-sm transition-colors ${
          isActive ? "text-foreground" : "text-muted hover:text-foreground"
        }`}
        style={{ letterSpacing: "-0.01em" }}
      >
        {section.label}
        <svg
          aria-hidden
          className={`size-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-48 rounded-lg border border-border bg-background shadow-lg py-1.5 z-50">
          {section.items.map((item) => {
            const active = item.href === sectionActiveHref;
            return item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-secondary/60 transition-colors"
                style={{ letterSpacing: "-0.01em" }}
              >
                {item.label}
                <ExternalIcon />
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm transition-colors ${
                  active
                    ? "text-accent font-medium bg-accent/8"
                    : "text-muted hover:text-foreground hover:bg-surface-secondary/60"
                }`}
                style={{ letterSpacing: "-0.01em" }}
              >
                {active && (
                  <span className="mr-2 size-1.5 rounded-full bg-accent flex-shrink-0" />
                )}
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 bg-background border-b border-border ${
          isHome ? "border-transparent" : "border-border"
        }`}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 sm:px-8">

          {/* Wordmark */}
          <Link
            href="/"
            className="flex items-center transition-opacity hover:opacity-70"
          >
            <img
              src="/images/physlib-logo.png"
              alt={site.name}
              width={1600}
              height={459}
              className="logo-mark h-7 w-auto"
            />
          </Link>

          {/* Desktop nav — centered, section dropdowns */}
          <nav className="hidden absolute left-1/2 -translate-x-1/2 items-center md:flex">
            {navSections.map((section) => (
              <NavDropdown key={section.label} section={section} pathname={pathname} />
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <a
              href={site.search}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 rounded px-3 text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                letterSpacing: "-0.01em",
              }}
            >
              Search
            </a>
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 rounded px-3 text-xs font-medium transition-opacity hover:opacity-80"
              style={{
                background: "var(--github-button-bg)",
                color: "var(--github-button-fg)",
                letterSpacing: "-0.01em",
              }}
            >
              <GitHubIcon />
              GitHub
            </a>
            <ThemeToggle />
            <button
              onClick={() => setOpen((v: boolean) => !v)}
              aria-label="Toggle menu"
              className="inline-flex md:hidden items-center justify-center size-8 rounded border border-border text-muted hover:text-foreground transition-colors"
            >
              {open ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile fullscreen */}
      {open && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background pt-14 md:hidden overflow-y-auto">
          <nav className="flex flex-col px-5 py-6 border-t border-border">
            {navSections.map((section) => {
              const sectionActiveHref = activeHref(section.items, pathname);
              return (
                <div key={section.label} className="mb-8 last:mb-0">
                  <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
                    {section.label}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {section.items.map((item) => {
                      const active = item.href === sectionActiveHref;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center justify-between rounded-lg px-2 py-2 text-base transition-colors ${
                              active
                                ? "text-accent font-medium bg-accent/8"
                                : "text-muted hover:text-foreground"
                            }`}
                          >
                            <span className="flex items-center">
                              {active && (
                                <span className="mr-3 size-1.5 rounded-full bg-accent flex-shrink-0" />
                              )}
                              {item.label}
                            </span>
                            {item.external && <span className="opacity-40 text-xs">↗</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            <div className="mt-4 pt-8 border-t border-border flex flex-col gap-3">
              <a
                href={site.search}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 h-11 rounded px-4 text-sm font-medium w-full justify-center transition-opacity hover:opacity-80"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                Search Physlib
              </a>
              <a
                href={site.github}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 h-11 rounded px-4 text-sm font-medium w-full justify-center transition-opacity hover:opacity-80"
                style={{ background: "var(--github-button-bg)", color: "var(--github-button-fg)" }}
              >
                <GitHubIcon />
                GitHub
              </a>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
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
