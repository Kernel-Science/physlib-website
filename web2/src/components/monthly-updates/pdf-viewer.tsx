export function PdfViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border bg-surface-secondary/30">
        <iframe src={url} title={title} className="h-[80vh] min-h-[600px] w-full" />
      </div>
    </div>
  );
}
