"use client";

import { useEffect, useState, type ReactNode } from "react";

export type InstallStep = {
  id: string;
  title: string;
  body: ReactNode;
};

const STORAGE_KEY = "physlib-install-steps";

/** A choice between alternative instructions inside a step, e.g. forking
 * versus cloning directly. */
export function InstallChoice({ options }: { options: { label: string; content: ReactNode }[] }) {
  const [selected, setSelected] = useState(0);
  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex w-fit flex-wrap gap-1 rounded-lg border border-border bg-foreground/[0.03] p-1">
        {options.map((o, i) => (
          <button
            key={o.label}
            type="button"
            role="tab"
            aria-selected={selected === i}
            onClick={() => setSelected(i)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              selected === i ? "bg-background text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-col gap-3">
        {options[selected].content}
      </div>
    </div>
  );
}

/** Numbered installation steps, each with a tick box the reader can use to
 * track their progress. Ticks are remembered per browser. */
export function InstallSteps({ steps }: { steps: InstallStep[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setDone(JSON.parse(stored));
    } catch {
      // Storage unavailable: ticks just won't persist.
    }
  }, []);

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const reset = () => {
    setDone({});
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const completed = steps.filter((s) => done[s.id]).length;
  const allDone = completed === steps.length;

  return (
    <div>
      {/* Progress */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
        <p className="label-mono text-muted whitespace-nowrap">
          {completed} / {steps.length} done
        </p>
        {completed > 0 && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => {
          const isDone = !!done[step.id];
          return (
            <li
              key={step.id}
              className={`rounded border bg-background shadow-together transition-colors ${
                isDone ? "border-success/40" : "border-border"
              }`}
            >
              <div className="flex gap-4 p-5 sm:gap-5 sm:p-6">
                {/* Tick box */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={`Mark step ${i + 1}, ${step.title}, as ${isDone ? "not done" : "done"}`}
                  onClick={() => toggle(step.id)}
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    isDone
                      ? "border-success bg-success text-background"
                      : "border-foreground/25 hover:border-accent"
                  }`}
                >
                  {isDone ? (
                    <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M3.5 8.5l3 3 6-7" />
                    </svg>
                  ) : (
                    <span className="text-xs font-semibold text-muted">{i + 1}</span>
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="label-mono text-accent mb-1">Step {i + 1}</p>
                  <h3
                    className={`text-xl font-medium leading-tight mb-3 transition-colors ${
                      isDone ? "text-muted" : "text-foreground"
                    }`}
                    style={{ letterSpacing: "-0.03em" }}
                  >
                    {step.title}
                  </h3>
                  <div className="flex flex-col gap-3 text-sm text-foreground/85 leading-relaxed">
                    {step.body}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {allDone && (
        <div className="mt-4 rounded border border-success/30 bg-success/10 px-5 py-4 text-sm text-foreground">
          You&apos;re all set. Open any file in <code className="font-mono">Physlib/</code> and
          Lean will check it as you read.
        </div>
      )}
    </div>
  );
}
