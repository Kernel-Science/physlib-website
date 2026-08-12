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
