"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

interface Heading {
  id: string;
  text: string;
  level: number;
}

const headingSelector = "h2[id], h3[id], header[id]";

function containsHeading(node: Node) {
  return node instanceof HTMLElement &&
    (node.matches(headingSelector) || node.querySelector(headingSelector) !== null);
}

function changedHeading(record: MutationRecord) {
  const target = record.target instanceof Element ? record.target : record.target.parentElement;
  if (!(target instanceof HTMLElement)) return false;
  if (record.type === "attributes") return target.matches("h2, h3, header");
  if (target.closest(headingSelector)) return true;
  return Array.from(record.addedNodes).some(containsHeading) ||
    Array.from(record.removedNodes).some(containsHeading);
}

export function TableOfContents() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const scan = () => {
      const elements = main.querySelectorAll(headingSelector);
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
      setActiveId((current) => headingList.some(({ id }) => id === current)
        ? current : headingList[0]?.id ?? "");
    };
    scan();
    // Headings can change after a route has mounted, including streamed content.
    // Ignore graph rendering and other changes that don't affect this navigation.
    const observer = new MutationObserver((records) => {
      if (records.some(changedHeading)) scan();
    });
    observer.observe(main, {
      childList: true, subtree: true, characterData: true, attributeFilter: ["id"],
    });
    return () => observer.disconnect();
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

  // A list of one section is not worth showing. The column is still kept, on
  // every page, so the content does not jump sideways after load.
  if (headings.length < 2)
    return <aside aria-hidden="true" className="hidden w-52 shrink-0 lg:block" />;

  return (
    <aside className="hidden w-52 shrink-0 lg:block pt-16">
      <nav className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-3 pl-6">
        <p className="site-nav-heading">
          On this page
        </p>
        <ul className="flex flex-col">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={activeId === heading.id ? "location" : undefined}
                className={`site-nav-link site-sidebar-link ${heading.level === 3 ? "pl-6" : "pl-2"}`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
