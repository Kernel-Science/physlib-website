import { GitHubIcon } from "@/components/monthly-updates/icons";

/** The site's one filled "does a thing on GitHub" button style - same
 *  black/white tokens and layout as the navbar's own GitHub button, so
 *  these dialogs hand off to GitHub looking like every other GitHub link on
 *  the site rather than inventing their own accent-colored variant.
 *
 *  `ready` fades it to 40% with no hover brightening, standing in for a
 *  disabled look - but it's never actually the `disabled` attribute, since
 *  a truly disabled element can't be clicked, and clicking while incomplete
 *  is exactly what's supposed to redden the empty fields below. Hover was
 *  deliberately left out of the faded state: `hover:opacity-80` would have
 *  beaten the fade the moment the pointer landed on the button to click it -
 *  the one moment the grey cue most needs to hold. */
export function githubButtonClasses(ready: boolean): string {
  const base = "flex items-center gap-1.5 rounded-(--radius) px-3 py-1.5 text-sm font-medium transition-opacity";
  return ready ? `${base} hover:opacity-80` : `${base} opacity-40`;
}

export const githubButtonStyle = {
  background: "var(--github-button-bg)",
  color: "var(--github-button-fg)",
  letterSpacing: "-0.01em",
} as const;

/** GitHub starts rejecting very long URLs; the Physlib Verso wiki, which this
 *  flow mirrors, uses the same ceiling before falling back to the clipboard.
 *  Leaves room for roughly 5,000 characters of typed text once percent-
 *  encoding expands it. */
export const MAX_URL_LENGTH = 7500;

export type SuggestTab = "issue" | "pr";

export function CloseIcon() {
  return (
    <svg
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6l12 12M18 6L6 18"
      />
    </svg>
  );
}

/** The two-way switch at the top of every suggest dialog: file an issue for
 *  a maintainer to act on, or make the change directly on GitHub yourself. */
export function TabSwitcher({
  tab,
  setTab,
}: {
  tab: SuggestTab;
  setTab: (t: SuggestTab) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-secondary/40 p-1">
      {(["issue", "pr"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={`rounded-(--radius) px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === t
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          {t === "issue" ? "Create a GitHub issue" : "Change the code directly"}
        </button>
      ))}
    </div>
  );
}

export { GitHubIcon };
