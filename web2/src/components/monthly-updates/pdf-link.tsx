import { TopRightArrowIcon } from "./icons";

export function PdfLink({ href }: { href?: string }) {
  if (!href) {
    return (
      <span
        aria-disabled
        title="Not generated yet"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted"
      >
        PDF report
        <TopRightArrowIcon className="size-3.5 opacity-40" />
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/8 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/15"
    >
      PDF report
      <TopRightArrowIcon />
    </a>
  );
}
