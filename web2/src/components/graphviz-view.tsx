"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3: any;
    Graphviz: unknown;
  }
}

// Keyed by src, so repeat calls - e.g. React Strict Mode's dev-only
// mount/unmount/remount cycle - await the *same* load rather than each
// racing to check "is a <script> tag already in the DOM", which is true
// well before that tag's own load event has actually fired.
const scriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let promise = scriptLoads.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
    scriptLoads.set(src, promise);
  }
  return promise;
}

type Props = {
  getDot: () => Promise<string>;
  height?: string;
};

export function GraphvizView({ getDot, height = "500px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadScript("https://d3js.org/d3.v7.min.js");
        await loadScript(
          "https://unpkg.com/@hpcc-js/wasm@2.20.0/dist/graphviz.umd.js",
        );
        // d3-graphviz v5 resolves @hpcc-js/wasm via window["@hpcc-js/wasm"],
        // but the UMD bundle registers itself as window.hpcc — bridge the gap.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any)["@hpcc-js/wasm"] = (window as any).hpcc;
        await loadScript(
          "https://unpkg.com/d3-graphviz@5.6.0/build/d3-graphviz.js",
        );

        if (cancelled || !containerRef.current) return;

        const dot = await getDot();
        if (cancelled || !containerRef.current) return;

        setLoading(false);

        window
          .d3!.select(containerRef.current)
          .graphviz()
          .zoom(true)
          .zoomScaleExtent([0.1, Infinity])
          .fit(true)
          .width("100%")
          .height(height)
          .engine("dot")
          .renderDot(dot);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load the graph. Please refresh the page.");
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [getDot, height]);

  return (
    <div className="relative rounded-xl border border-border overflow-hidden bg-white">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted text-sm">
          Loading graph…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-danger text-sm px-4 text-center">
          {error}
        </div>
      )}
      <div ref={containerRef} style={{ height, width: "100%" }} />
    </div>
  );
}
