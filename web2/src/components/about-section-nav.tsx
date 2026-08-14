import Link from "next/link";
import { aboutSections } from "@/lib/about-content";

/** Links to the other pages in the About section, shown at the foot of each one. */
export function AboutSectionNav({ current }: { current: string }) {
  const others = aboutSections.filter((s) => s.href !== current);

  return (
    <nav className="mt-20 border-t border-border pt-10">
      <p className="label-mono text-muted mb-6">More about Physlib</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {others.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-start gap-4 rounded border border-border bg-background px-5 py-4 transition-colors hover:bg-foreground/5"
          >
            <span className="flex-1">
              <span
                className="block text-sm font-medium text-foreground"
                style={{ letterSpacing: "-0.01em" }}
              >
                {s.label}
              </span>
              <span
                className="mt-1 block text-xs text-muted leading-relaxed"
                style={{ letterSpacing: "-0.01em" }}
              >
                {s.tagline}
              </span>
            </span>
            <span className="text-muted text-xs transition-colors group-hover:text-foreground">
              →
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
