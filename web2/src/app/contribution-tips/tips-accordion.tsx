"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Keep shared tip links useful when the tips start collapsed. */
export function TipsAccordion({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openLinkedTip = () => {
      const tip = document.getElementById(window.location.hash.slice(1));
      if (tip instanceof HTMLDetailsElement && container.current?.contains(tip)) {
        tip.open = true;
      }
    };
    openLinkedTip();
    window.addEventListener("hashchange", openLinkedTip);
    return () => window.removeEventListener("hashchange", openLinkedTip);
  }, []);

  return (
    <div ref={container} className="divide-y divide-border border-y border-border">
      {children}
    </div>
  );
}
