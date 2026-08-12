import Link from "next/link";
import { site } from "@/lib/site";
import { GetInvolvedCarousel } from "@/components/get-involved-carousel";

export default function HomePage() {
  return (
    <div className="w-full overflow-x-hidden">

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <section className="hero-gradient relative min-h-svh flex flex-col items-center justify-center px-5 text-center">
        <div className="animate-fade-up max-w-4xl mx-auto">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded px-2 py-1 mb-8 border border-accent/30 bg-accent/10">
            <span className="label-mono text-accent">Open Source · Lean 4 · Community</span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-medium text-foreground leading-tight"
            style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
          >
            Digitalizing Physics<br />in Lean&nbsp;4
          </h1>

          {/* Sub */}
          <p
            className="mt-6 max-w-xl mx-auto text-lg text-muted animate-fade-up delay-100"
            style={{ letterSpacing: "-0.01em", lineHeight: 1.4 }}
          >
            An open-source, community project to digitalize results from physics
            into Lean&nbsp;4.
            <br />
            <span className="text-base text-foreground/35">(formerly PhysLean &amp; Lean-QuantumInfo)</span>
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up delay-200">
            <Link
              href="/getting-started"
              className="inline-flex h-11 items-center gap-2 rounded px-6 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
            >
              Get Started
              <ArrowRight />
            </Link>
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded px-6 text-sm font-medium text-foreground border border-border transition-colors hover:bg-foreground/5"
              style={{ letterSpacing: "-0.01em" }}
            >
              <GitHubIcon />
              View on GitHub
            </a>
            <a
              href={site.zulip}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center px-4 text-sm text-muted hover:text-foreground transition-colors"
              style={{ letterSpacing: "-0.01em" }}
            >
              Join Community
            </a>
          </div>
        </div>
      </section>

      {/* ═══ GET INVOLVED ════════════════════════════════════════ */}
      <section className="bg-background border-t border-border py-24 md:py-32">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <p className="label-mono text-muted mb-5">Get Involved</p>
          <h2
            className="text-4xl font-medium text-foreground mb-14 md:text-5xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            How you can contribute:
          </h2>
          <GetInvolvedCarousel />
        </div>
      </section>

      {/* ═══ WHAT IS LEAN ═══════════════════════════════════════ */}
      <section className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 grid gap-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="label-mono text-muted mb-5">About Lean</p>
            <h2
              className="text-4xl font-medium text-foreground leading-tight"
              style={{ letterSpacing: "-0.04em" }}
            >
              A theorem prover that guarantees correctness.
            </h2>
            <p
              className="mt-6 text-lg text-muted leading-snug"
              style={{ letterSpacing: "-0.01em" }}
            >
              Lean is an interactive theorem prover where you write mathematical
              definitions, theorems, and proofs — and the system verifies
              correctness using type theory, with no gaps or hand-waving.
            </p>
            <p
              className="mt-4 text-lg text-foreground/40 leading-snug"
              style={{ letterSpacing: "-0.01em" }}
            >
              Increasingly used by AI labs and mathematicians, Lean is now
              making its way into physics through Physlib.
            </p>
          </div>

          {/* Code card */}
          <div className="rounded overflow-hidden bg-background border border-border shadow-together">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-foreground/5">
              <span className="size-2.5 rounded-full bg-red-400/60" />
              <span className="size-2.5 rounded-full bg-yellow-400/60" />
              <span className="size-2.5 rounded-full bg-green-400/60" />
              <span className="ml-3 text-xs text-foreground/30 font-mono">WicksTheorem.lean</span>
            </div>
            <div className="bg-[#1e1e1e] p-4 md:p-5 text-[13px] font-mono text-[#d4d4d4] leading-relaxed">
              <pre className="whitespace-pre-wrap break-words">
                <code>
                  <span className="text-[#569cd6]">theorem</span> <span className="text-[#9cdcfe]">wicks_theorem</span> : (φs : <span className="text-[#4ec9b0]">List</span> 𝓕.FieldOp) → 𝓣(<span className="text-[#9cdcfe]">ofFieldOpList</span> φs) ={"\n"}
                  {"  "}∑ (φsΛ : <span className="text-[#4ec9b0]">WickContraction</span> φs.length), φsΛ.wickTerm{"\n"}
                  | [] <span className="text-[#569cd6]">=&gt;</span> <span className="text-[#569cd6]">by</span>{"\n"}
                  {"  "}<span className="text-[#9cdcfe]">rw</span> [timeOrder_ofFieldOpList_nil]{"\n"}
                  {"  "}<span className="text-[#9cdcfe]">simp</span> <span className="text-[#569cd6]">only</span> [map_one, <span className="text-[#4ec9b0]">List</span>.length_nil, <span className="text-[#4ec9b0]">Algebra</span>.smul_mul_assoc]{"\n"}
                  {"  "}<span className="text-[#9cdcfe]">rw</span> [sum_WickContraction_nil]{"\n"}
                  {"  "}<span className="text-[#9cdcfe]">simp</span> <span className="text-[#569cd6]">only</span> [wickTerm_empty_nil]{"\n"}
                  | φ :: φs <span className="text-[#569cd6]">=&gt;</span> <span className="text-[#569cd6]">by</span>
                </code>
            </pre>
            </div>
            <div className="px-4 py-2.5 text-xs text-foreground/30 font-mono border-t border-border">
              Wick&apos;s theorem — formally verified in Physlib.
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MISSION ═════════════════════════════════════════════ */}
      <section className="border-t border-border py-24 md:py-32" style={{ background: "color-mix(in oklch, var(--accent) 8%, var(--background))" }}>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="label-mono text-muted mb-8">Mission</p>
          <p
            className="max-w-4xl text-4xl font-medium text-foreground leading-tight md:text-5xl lg:text-6xl mb-20"
            style={{ letterSpacing: "-0.04em" }}
          >
            Create a library of digitalized physics results in Lean&nbsp;4,
            useful to the broad physics community.
          </p>

          <div className="grid gap-x-16 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {visionPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-5">
                <span className="label-mono text-accent/50 flex-shrink-0 pt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  className="text-sm text-muted leading-relaxed"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VALUES ═════════════════════════════════════════════ */}
      <section className="bg-background border-t border-border py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="label-mono text-muted mb-5">Values</p>
          <h2
            className="text-4xl font-medium text-foreground mb-14 md:text-5xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            Built on principles.
          </h2>
          <div className="divide-y divide-border">
            {values.map((v, i) => (
              <div
                key={v.title}
                className="grid grid-cols-[2.5rem_1fr] md:grid-cols-[3rem_18rem_1fr] gap-x-8 md:gap-x-12 py-10 items-start"
              >
                <span className="label-mono text-accent pt-1">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  className="text-xl font-medium text-foreground"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  {v.title}
                </h3>
                <p
                  className="col-start-2 md:col-start-3 mt-3 md:mt-0 text-sm text-muted leading-relaxed"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {v.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AUDIENCES ═══════════════════════════════════════════ */}
      <section className="bg-surface-secondary border-t border-border py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="label-mono text-muted mb-8">Beneficiaries</p>
          <h2
            className="text-4xl font-medium text-foreground mb-16 md:text-5xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            For physicists and<br />formal-methods researchers.
          </h2>
          <div className="grid gap-16 md:grid-cols-2">
            {audiences.map((a) => (
              <div key={a.title}>
                <p className="label-mono text-muted mb-4">{a.tag}</p>
                <h3
                  className="text-2xl font-medium text-foreground mb-8"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  {a.title}
                </h3>
                <ul className="space-y-4">
                  {a.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-4 text-sm text-muted"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      <span className="flex-shrink-0 text-accent">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ IMPACT ═════════════════════════════════════════════ */}
      <section className="bg-background border-t border-border py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="label-mono text-muted mb-5">Impact</p>
          <h2
            className="text-4xl font-medium text-foreground mb-14 md:text-5xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            Why formalize physics?
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {impacts.map((item, i) => (
              <div
                key={i}
                className="flex gap-5 rounded p-6 bg-background border border-border shadow-together"
              >
                <span
                  className="text-2xl font-medium text-accent/40 font-mono flex-shrink-0 leading-none tabular-nums"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  className="text-sm text-muted leading-relaxed"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ════════════════════════════════════════════════ */}
      <section className="hero-gradient border-t border-border">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 py-28 md:py-36 text-center">
          <p className="label-mono text-foreground/35 mb-4">Join Physlib</p>
          <h2
            className="text-4xl font-medium text-foreground mb-6 md:text-5xl lg:text-6xl"
            style={{ letterSpacing: "-0.04em", lineHeight: 1.06 }}
          >
            Help build the future<br />of physics.
          </h2>
          <p
            className="mx-auto max-w-md text-lg text-muted mb-10 leading-snug"
            style={{ letterSpacing: "-0.01em" }}
          >
            Whether you&apos;re a physicist, a Lean developer, or just curious —
            there&apos;s a place for you in Physlib.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/getting-started"
              className="inline-flex h-12 items-center gap-2 rounded px-7 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
            >
              Start contributing
              <ArrowRight />
            </Link>
            <Link
              href="/get-involved"
              className="inline-flex h-12 items-center gap-2 rounded px-7 text-sm font-medium text-muted hover:text-foreground border border-border transition-colors"
              style={{ letterSpacing: "-0.01em" }}
            >
              Learn more
            </Link>
          </div>
          <p className="mt-8 text-sm text-foreground/30">
            Read the paper:{" "}
            <a
              href="https://inspirehep.net/literature/2787050"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground/60 transition-colors underline underline-offset-2"
            >
              arXiv:2405.08863
            </a>
          </p>
        </div>
      </section>

    </div>
  );
}

/* ─── Data ──────────────────────────────────────────────────── */

const visionPoints = [
  "Comprehensive repository of fundamental physics definitions, theorems, and calculations.",
  "Interface between experimental data, simulations, and formal theoretical frameworks.",
  "Extensive, physics-focused documentation to support adoption.",
  "Accessible to physicists at all levels — especially those new to formal methods.",
  "An intuitive setup that aligns with how physicists think and work.",
  "A large, active team with the potential for high-energy-physics-style collaborations.",
];

const values = [
  {
    title: "Welcoming",
    body: "Contributors of all academic backgrounds and experience levels are valued, supported, and empowered to make meaningful contributions.",
  },
  {
    title: "Open & Transparent",
    body: "Physlib is openly accessible, freely available, and developed with full transparency for the benefit of both communities.",
  },
  {
    title: "Accessible & Practical",
    body: "Designed to be intuitive and well-documented, directly useful to physicists regardless of their familiarity with formal methods.",
  },
];

const audiences = [
  {
    tag: "Academic",
    title: "Researchers & Students",
    items: [
      "Students in physics, mathematics, or computer science",
      "Research physicists formalizing theoretical results",
      "AI researchers verifying mathematical theorems",
      "Educators creating novel teaching approaches",
    ],
  },
  {
    tag: "Industrial",
    title: "Companies & Labs",
    items: [
      "Companies leveraging AI for formal reasoning at scale",
      "Organizations proving correctness of physical processes",
      "Teams building verified simulation frameworks",
      "Enterprises ensuring theoretical soundness of models",
    ],
  },
];

const impacts = [
  "Make it easier to find and reference existing results across physics.",
  "Enable AI and machine learning to automate discovery of new results.",
  "Check papers and results for mathematical correctness automatically.",
  "Create new avenues through which physics can be taught and explored.",
  "Open new ways to interface between theory and computer programs.",
  "Build a shared, standardized foundation for the whole physics community.",
];

/* ─── Icons ─────────────────────────────────────────────────── */

function ArrowRight() {
  return (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.13-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.18a10.93 10.93 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.57.23 2.73.11 3.02.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
