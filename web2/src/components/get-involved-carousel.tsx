"use client";

import { useState } from "react";
import Link from "next/link";

const cards = [
  {
    title: "Promote the project",
    items: [
      "Share on social media (LinkedIn, X, Reddit)",
      "Mention Physlib to colleagues, students, or supervisors",
      "Reference the project in talks, papers, or course materials",
      "Star the repository on GitHub to boost visibility",
    ],
    cta: { label: "View on GitHub", href: "https://github.com/leanprover-community/Physlib", external: true },
  },
  {
    title: "Contribute Lean code",
    items: [
      "Pick up open issues labeled 'good first issue' on GitHub",
      "Formalize theorems, definitions, or calculations from physics",
      "Golf existing proofs",
      "Work on the APIs",
    ],
    cta: { label: "Browse issues", href: "https://github.com/leanprover-community/Physlib/issues", external: true },
  },
  {
    title: "Create informal results",
    items: [
      "Write up clear mathematical statements of physics results",
      "Provide references to formal proofs",
      "Describe what a result means physically and why it matters",
      "Open a GitHub issue or post in Zulip with your informal write-up",
    ],
    cta: { label: "Join Zulip", href: "https://leanprover.zulipchat.com/", external: true },
  },
  {
    title: "Review the documentation",
    items: [
      "Read through existing docs and note anything unclear or incorrect",
      "Check that examples and code snippets still work",
      "Suggest better explanations or missing context",
      "Report issues or open a PR with fixes directly",
    ],
    cta: { label: "Read the docs", href: "/getting-started", external: false },
  },
];

export function GetInvolvedCarousel() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const [animKey, setAnimKey] = useState(0);

  function go(next: number) {
    const newIndex = (next + cards.length) % cards.length;
    setDir(next > index || (index === cards.length - 1 && next === 0) ? "right" : "left");
    setIndex(newIndex);
    setAnimKey((k) => k + 1);
  }

  const card = cards[index];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* carousel row */}
      <div className="w-full flex items-center gap-4 md:gap-6">

        {/* left arrow */}
        <button
          onClick={() => go(index - 1)}
          aria-label="Previous"
          className="flex-shrink-0 size-10 rounded border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <ChevronLeft />
        </button>

        {/* card */}
        <div
          key={animKey}
          className="flex-1 rounded border border-border bg-background shadow-together p-7 md:p-10"
          style={{ animation: `carousel-in-${dir ?? "right"} 0.22s ease both` }}
        >
          <h3
            className="text-3xl font-medium text-foreground mb-8 md:text-4xl"
            style={{ letterSpacing: "-0.04em" }}
          >
            {card.title}
          </h3>

          <ul className="space-y-3 mb-8">
            {card.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm text-muted"
                style={{ letterSpacing: "-0.01em" }}
              >
                <span className="flex-shrink-0 text-accent mt-px">—</span>
                {item}
              </li>
            ))}
          </ul>

          {card.cta.external ? (
            <a
              href={card.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded px-5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
            >
              {card.cta.label}
              <ExternalIcon />
            </a>
          ) : (
            <Link
              href={card.cta.href}
              className="inline-flex h-9 items-center gap-2 rounded px-5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)", letterSpacing: "-0.01em" }}
            >
              {card.cta.label}
            </Link>
          )}
        </div>

        {/* right arrow */}
        <button
          onClick={() => go(index + 1)}
          aria-label="Next"
          className="flex-shrink-0 size-10 rounded border border-border flex items-center justify-center text-muted hover:text-foreground hover:border-foreground/20 transition-colors"
        >
          <ChevronRight />
        </button>
      </div>

      {/* dot indicators */}
      <div className="flex items-center gap-2">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to card ${i + 1}`}
            className="rounded-full transition-all"
            style={{
              width: i === index ? "1.5rem" : "0.375rem",
              height: "0.375rem",
              background: i === index ? "var(--accent)" : "var(--border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
