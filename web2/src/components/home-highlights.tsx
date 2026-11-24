"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./home-highlights.module.css";

const headings = ["Ways to Contribute", "Explore Formalized Physics"];
const rotationMs = 8_000;
type ExternalBookmark = "0" | "1" | null;

function AtlasBookmark({onChange}: {onChange: (scope: ExternalBookmark) => void}) {
  const external = useSearchParams().get("external");
  useEffect(() => {
    onChange(external === "0" || external === "1" ? external : null);
  }, [external,onChange]);
  return null;
}

export function HomeHighlights({ children }: { children: ReactNode }) {
  const [slide, setSlide] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [reading, setReading] = useState(false);
  const [externalBookmark, setExternalBookmark] = useState<ExternalBookmark>(null);
  const panel = useRef<HTMLElement>(null);
  const rotate = !reducedMotion && !reading;

  const openBookmark = useCallback((scope: ExternalBookmark) => {
    setExternalBookmark(scope);
    setSlide(scope === null ? 0 : 1);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!rotate || !panel.current) return;
    let visible = false;
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      if (visible && !document.hidden) {
        timer = window.setTimeout(() => setSlide(current => 1 - current), rotationMs);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.intersectionRatio >= 0.25;
      schedule();
    }, { threshold: 0.25 });
    observer.observe(panel.current);
    document.addEventListener("visibilitychange", schedule);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      window.clearTimeout(timer);
    };
  }, [rotate, slide]);

  return (
    <section ref={panel} className={styles.carousel} data-slide={slide} aria-label="Explore and contribute" aria-roledescription="carousel"
      onFocusCapture={event => setReading(event.target.matches("a:focus-visible"))}
      onBlurCapture={() => setReading(false)}>
      <Suspense fallback={null}><AtlasBookmark onChange={openBookmark}/></Suspense>
      <div className={styles.stage} aria-live={rotate ? "off" : "polite"}>
        {headings.map((title, index) => (
          <div key={title} className={styles.slide} inert={slide !== index}
            aria-hidden={slide !== index} role="group" aria-roledescription="slide" aria-label={title}>
            {index === 0 ? children : (
              <Link href={externalBookmark ? `/roadmap?external=${externalBookmark}` : "/roadmap"}
                prefetch={false} className={styles.roadmapLink} aria-label="Open the Physlib Atlas">
                <span aria-hidden="true" className={styles.preview} data-external={externalBookmark === "1"}/>
                <h2 className="label-mono text-muted mt-3">Explore Formalized Physics</h2>
                <span className="mt-0.5 block text-sm text-accent">Open the Physlib Atlas <span aria-hidden="true">→</span></span>
              </Link>
            )}
          </div>
        ))}
      </div>
      <div className={styles.pager} role="group" aria-label="Choose a slide">
        <button type="button" aria-label="Show Ways to Contribute" aria-current={slide === 0 ? "true" : undefined}
          onClick={() => setSlide(0)}>1</button>
        <span aria-hidden="true">|</span>
        <button type="button" aria-label="Show Physlib Atlas" aria-current={slide === 1 ? "true" : undefined}
          onClick={() => setSlide(1)}>2</button>
      </div>
    </section>
  );
}
