"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { setReferencesHash, type ReferencesSelection } from "@/lib/references-hash";

function NavLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        aria-current={active ? "location" : undefined}
        className="site-nav-link site-sidebar-link px-2"
      >
        <span className="font-mono">
          {/* Wrap only at "/" (via <wbr/>), not mid-word, for a path like
              "Physlib/ClassicalMechanics" - break-all would chop words
              anywhere and plain overflow-wrap doesn't treat "/" as a break
              opportunity at all, so long segments would just overflow. */}
          {label.split("/").map((segment, i) => (
            <span key={i}>
              {i > 0 && (
                <>
                  /<wbr />
                </>
              )}
              {segment}
            </span>
          ))}
        </span>
      </a>
    </li>
  );
}

// The site layout owns this column. The references view supplies its links from
// the same filtered groups it renders, including when the reader searches.
const sidebarId = "reference-navigation";

export function ReferencesSidebar() {
  return <aside id={sidebarId} className="hidden w-52 shrink-0 lg:block pt-16" />;
}

export function ReferenceGroupLinks({ selection, groups }: { selection: ReferencesSelection; groups: string[] }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => { setHost(document.getElementById(sidebarId)); }, []);
  if (!host || selection.view === "cited" || groups.length === 0) return null;
  const byAuthor = selection.view === "author";
  const active = selection.view === "author" ? selection.letter : selection.subfolder;
  return createPortal(
    <nav aria-label={byAuthor ? "Author groups" : "Subfolder groups"}
      className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto py-8 pr-3 pl-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <p className="site-nav-heading">{byAuthor ? "Authors" : "Subfolders"}</p>
      <ul className="flex flex-col">
        {groups.map((label) => (
          <NavLink key={label} label={label} active={active === label}
            onClick={() => setReferencesHash(byAuthor ? { view: "author", letter: label } : { view: "subfolder", subfolder: label })} />
        ))}
      </ul>
    </nav>,
    host,
  );
}
