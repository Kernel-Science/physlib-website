import { PdfLink } from "./pdf-link";

export function MonthPending({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">{label}</h2>
        <PdfLink />
      </header>
      <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-muted">
        This report hasn&apos;t been generated yet. It will appear here once
        it&apos;s published.
      </div>
    </div>
  );
}
