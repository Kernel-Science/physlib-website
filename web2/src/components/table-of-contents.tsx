"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Re-scan headings whenever the page changes
  useEffect(() => {
    const timer = setTimeout(() => {
      // Matches both h2/h3[id] and PageHeader-style <header id="..."><h2>...</h2></header>
      const elements = document.querySelectorAll(
        "main h2[id], main h3[id], main header[id]"
      );
      const headingList = Array.from(elements).reduce<Heading[]>((acc, el) => {
        if (el.tagName === "HEADER") {
          const inner = el.querySelector("h2, h3");
          if (inner) {
            acc.push({
              id: el.id,
              text: inner.textContent?.trim() ?? "",
              level: inner.tagName === "H2" ? 2 : 3,
            });
          }
        } else {
          acc.push({
            id: el.id,
            text: el.textContent?.trim() ?? "",
            level: el.tagName === "H2" ? 2 : 3,
          });
        }
        return acc;
      }, []);
      setHeadings(headingList);
      setActiveId(headingList[0]?.id ?? "");
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Highlight the active section with IntersectionObserver
  useEffect(() => {
    if (headings.length === 0) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Pick the topmost visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-72px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden w-52 shrink-0 lg:block pt-16">
      <nav className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-8">
        <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
          On this page
        </p>
        <ul className="flex flex-col">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`flex items-center rounded-lg py-1.5 text-sm transition-colors ${
                  heading.level === 3 ? "pl-6 pr-2" : "px-2"
                } ${
                  activeId === heading.id
                    ? "text-accent font-medium"
                    : "text-muted hover:text-foreground"
                }`}
                style={{ letterSpacing: "-0.01em" }}
              >
                {activeId === heading.id && (
                  <span className="mr-2 size-1 rounded-full bg-accent flex-shrink-0" />
                )}
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
