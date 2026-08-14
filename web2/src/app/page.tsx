import Link from "next/link";
import { site } from "@/lib/site";
import { GetInvolvedCarousel } from "@/components/get-involved-carousel";

export default function HomePage() {
  return (
    <section className="hero-gradient grid min-h-[calc(100svh-3.5rem)] w-full lg:grid-cols-2">

      {/* ═══ IDENTITY ════════════════════════════════════════════ */}
      <div className="flex flex-col justify-center border-b border-border px-5 py-14 sm:px-8 sm:py-16 lg:border-r lg:border-b-0 lg:px-12 lg:py-16 xl:px-16">
        <div className="animate-fade-up">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded px-2 py-1 mb-8 border border-accent/30 bg-accent/10">
            <span className="label-mono text-accent">Open Source · Lean 4 · Community</span>
          </div>

          {/* Wordmark */}
          <h1 className="max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
            <img
              src="/images/physlib-logo.png"
              alt="Physlib"
              width={1600}
              height={459}
              className="logo-mark h-auto w-full"
            />
          </h1>

          {/* Tagline */}
          <p
            className="mt-6 text-2xl font-medium text-foreground sm:text-3xl lg:text-4xl"
            style={{ letterSpacing: "-0.04em", lineHeight: 1.1 }}
          >
            Digitalizing Physics in Lean&nbsp;4
          </p>

          {/* Sub */}
          <p
            className="mt-5 max-w-md text-base text-muted sm:text-lg"
            style={{ letterSpacing: "-0.01em", lineHeight: 1.4 }}
          >
            An open-source, community project to digitalize results from physics
            into Lean&nbsp;4.
            <br />
            <span className="text-sm text-foreground/35 sm:text-base">(formerly PhysLean &amp; Lean-QuantumInfo)</span>
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/getting-started"
              className="inline-flex h-11 items-center gap-2 rounded px-6 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
            >
              Get Started
              <ArrowRight />
            </Link>
            <Link
              href="/about"
              className="inline-flex h-11 items-center gap-2 rounded px-6 text-sm font-medium text-foreground border border-border transition-colors hover:bg-foreground/5"
              style={{ letterSpacing: "-0.01em" }}
            >
              Learn more
            </Link>
            <a
              href={site.zulip}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center text-sm text-muted hover:text-foreground transition-colors sm:px-4"
              style={{ letterSpacing: "-0.01em" }}
            >
              Join Community
            </a>
          </div>
        </div>
      </div>

      {/* ═══ GET INVOLVED ════════════════════════════════════════ */}
      <div className="flex flex-col justify-center px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-16 xl:px-16">
        <div className="animate-fade-up delay-100">
          <p className="label-mono text-muted mb-4">Get Involved</p>
          <h2
            className="text-2xl font-medium text-foreground mb-8 sm:text-3xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            How you can contribute:
          </h2>
          <GetInvolvedCarousel />
        </div>
      </div>
    </section>
  );
}

/* ─── Icons ─────────────────────────────────────────────────── */

function ArrowRight() {
  return (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
