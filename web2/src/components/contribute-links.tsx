import Link from "next/link";
import { site } from "@/lib/site";

/**
 * The home page's "How you can contribute": one button per way in, each
 * going straight to the place to start. The full guide lives on
 * /get-involved.
 */
const ways: { label: string; text: string; href: string; external?: boolean }[] = [
  {
    label: "Review",
    text: "Review open pull requests",
    href: "https://github.com/leanprover-community/physlib/issues/views/MDI0OlJlcG9zaXRvcnlTZWFyY2hTaG9ydGN1dDIyNDk0",
    external: true,
  },
  { label: "Edit the API maps", text: "Improve wiki-like articles", href: "/api-tracker" },
  { label: "Start an API map", text: "Map out an area that has none yet", href: "/api-tracker/new" },
  { label: "Contribute Lean code", text: "Pick up an open issue on GitHub", href: `${site.github}/issues`, external: true },
  { label: "Tackle a TODO", text: "Formalize something on the TODO list", href: "/todo" },
  { label: "Join the discussion", text: "Talk to the community on Zulip", href: site.zulip, external: true },
];

function Arrow({ external }: { external?: boolean }) {
  return (
    <svg
      aria-hidden
      className="size-4 shrink-0 text-muted transition-colors group-hover:text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={external ? "M7 17 17 7M8 7h9v9" : "M5 12h14m-6-6 6 6-6 6"}
      />
    </svg>
  );
}

export function ContributeLinks() {
  const cls =
    "group flex items-center justify-between gap-4 rounded border border-border bg-background px-4 py-3 transition-colors hover:border-accent";
  return (
    <div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ways.map((w) => {
          const inner = (
            <>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground" style={{ letterSpacing: "-0.01em" }}>
                  {w.label}
                </span>
                <span className="block text-xs text-muted">{w.text}</span>
              </span>
              <Arrow external={w.external} />
            </>
          );
          return (
            <li key={w.label}>
              {w.external ? (
                <a href={w.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link href={w.href} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <Link href="/get-involved" className="mt-4 inline-block text-sm text-accent hover:underline underline-offset-2">
        All the ways to contribute →
      </Link>
    </div>
  );
}
