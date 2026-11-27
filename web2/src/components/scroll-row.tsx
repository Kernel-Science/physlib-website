"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/*
 * A horizontally scrolling row with previous/next buttons and a fade on any
 * edge that has more content behind it. The row itself still scrolls by touch,
 * trackpad and keyboard; the buttons are a convenience for mouse users.
 */

export function ScrollRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanBack(el.scrollLeft > 4);
    setCanForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  const scroll = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    el.scrollBy({
      left: direction * el.clientWidth * 0.85,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const button =
    "flex size-7 items-center justify-center rounded-full border border-border text-foreground/70 transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30";

  return (
    <section aria-label={label}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3
          className="text-base font-medium text-foreground"
          style={{ letterSpacing: "-0.01em" }}
        >
          {label}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className={button}
            onClick={() => scroll(-1)}
            disabled={!canBack}
            aria-label="Previous"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            className={button}
            onClick={() => scroll(1)}
            disabled={!canForward}
            aria-label="Next"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
      <div className="relative">
        <ul
          ref={ref}
          onScroll={update}
          tabIndex={0}
          aria-label={`${label}: scrollable list`}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pt-1 pb-4 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-accent"
        >
          {children}
        </ul>
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity ${canBack ? "opacity-100" : "opacity-0"}`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity ${canForward ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </section>
  );
}
