/** The GitHub mark, used on buttons that hand off to a GitHub-hosted action
 *  (open an issue, open a pull request) - same path data as the navbar and
 *  footer's own copies, kept here too since this file is what the API
 *  tracker's dialogs already import icons from. */
export function GitHubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.13-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.18a10.93 10.93 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.57.23 2.73.11 3.02.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

/** Arrow pointing to the top-right, used for links that open a PDF/external
 *  resource in a new tab. */
export function TopRightArrowIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

/** Left double-quote glyph, used as the trigger for the "Cite this month"
 *  popover - visually the same idea as Google Scholar's quote-mark button. */
export function QuoteIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M7.17 6C4.87 7.13 3 9.5 3 12.5V18h6v-6H6c0-2.03 1.4-3.66 3.17-4.4L7.17 6Zm10 0c-2.3 1.13-4.17 3.5-4.17 6.5V18h6v-6h-3c0-2.03 1.4-3.66 3.17-4.4L17.17 6Z" />
    </svg>
  );
}

/** Overlapping-rectangles glyph for the "copy to clipboard" action. */
export function CopyIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" strokeLinejoin="round" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15V6a2 2 0 0 1 2-2h9"
      />
    </svg>
  );
}

/** Checkmark, paired with `CopyIcon` to acknowledge a successful copy. */
export function CheckIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 5 5L20 7" />
    </svg>
  );
}

/** Sparkle glyph used to mark "ask an AI about this" affordances. */
export function SparkleIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
}
