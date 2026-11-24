import Link from "next/link";
import { site } from "@/lib/site";

/**
 * The home page's "How you can contribute": one button per way in, each
 * going straight to the place to start. The full guide lives on
 * /get-involved.
 */
const ways: { label: string; text: string; href: string; external?: boolean }[] = [
  { label: "Review a PR", text: "Give feedback on submitted changes", href: "/pr-tracker" },
  { label: "Write a Wiki Article", text: "Explain a physics topic and link it to Lean", href: "/wiki/new" },
  { label: "Find a Task", text: "Browse issues, TODOs, and documentation tasks", href: site.tasks },
  { label: "Join the Discussion", text: "Talk to the community on Zulip", href: site.zulip, external: true },
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
    "group flex h-full items-center justify-between gap-4 rounded border border-border bg-background px-4 py-3 transition-colors hover:border-accent";
  return (
    <div>
      <ul className="grid auto-rows-fr gap-2 sm:grid-cols-2">
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
