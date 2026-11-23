/**
 * The site's expand/collapse marker: points right when collapsed and down
 * when open.
 */
export function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`inline-block size-3 shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
