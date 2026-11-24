"use client";

import { useEffect, useState } from "react";

export function DocsScopeToggle() {
  const [scope, setScope] = useState<"physlib" | "all">();

  useEffect(() => {
    if (!window.frameElement?.classList.contains("docs-site-header")) return;
    const parent = window.parent;
    const sync = () => {
      const value = parent.document.documentElement.dataset.docsScope;
      if (value === "physlib" || value === "all") setScope(value);
    };
    parent.addEventListener("physlib:docs-scope-updated", sync);
    sync();
    return () => parent.removeEventListener("physlib:docs-scope-updated", sync);
  }, []);

  if (!scope) return null;
  function choose(value: "physlib" | "all") {
    window.parent.dispatchEvent(new CustomEvent("physlib:docs-scope-change", { detail: value }));
  }
  return (
    <span className="docs-scope-toggle" role="group" aria-label="Library scope">
      <button type="button" aria-pressed={scope === "all"} onClick={() => choose("all")}>ALL</button>
      <span aria-hidden="true">|</span>
      <button type="button" aria-pressed={scope === "physlib"} onClick={() => choose("physlib")}>PHYSLIB</button>
    </span>
  );
}
