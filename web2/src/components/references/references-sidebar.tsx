"use client";

import { useEffect, useState } from "react";
import type { ReferenceLibrary } from "@/lib/yaml";
import { allAuthorLetters, allSubfolders } from "@/lib/references-groups";
import { decodeReferencesHash, setReferencesHash, type ReferencesSelection } from "@/lib/references-hash";

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
        className={`flex items-start rounded-lg px-2 py-1.5 text-sm transition-colors ${
          active ? "text-accent font-medium" : "text-muted hover:text-foreground"
        }`}
        style={{ letterSpacing: "-0.01em" }}
      >
        {active && <span className="mr-2 mt-1.5 size-1 rounded-full bg-accent flex-shrink-0" />}
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

export function ReferencesSidebar() {
  const [library, setLibrary] = useState<ReferenceLibrary | null>(null);
  const [selection, setSelection] = useState<ReferencesSelection>({ view: "cited" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/references")
      .then((res) => res.json())
      .then((data: ReferenceLibrary) => {
        if (!cancelled) setLibrary(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setSelection(decodeReferencesHash());
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // The sidebar only has anything to navigate to when the page is grouped
  // (By Subfolder / Alphabetical) - on Most Cited there are no sections, so
  // showing either list would link to a group the content isn't rendering.
  if (!library || library.references.length === 0) return null;
  if (selection.view === "cited") return null;

  return (
    <aside className="hidden w-52 shrink-0 lg:block pt-16">
      <nav
        className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {selection.view === "subfolder" && (
          <>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
              Subfolders
            </p>
            <ul className="flex flex-col">
              {allSubfolders(library.references).map((subfolder) => (
                <NavLink
                  key={subfolder}
                  label={subfolder}
                  active={selection.subfolder === subfolder}
                  onClick={() => setReferencesHash({ view: "subfolder", subfolder })}
                />
              ))}
            </ul>
          </>
        )}

        {selection.view === "author" && (
          <>
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
              Authors
            </p>
            <ul className="flex flex-col">
              {allAuthorLetters(library.references).map((letter) => (
                <NavLink
                  key={letter}
                  label={letter}
                  active={selection.letter === letter}
                  onClick={() => setReferencesHash({ view: "author", letter })}
                />
              ))}
            </ul>
          </>
        )}
      </nav>
    </aside>
  );
}
