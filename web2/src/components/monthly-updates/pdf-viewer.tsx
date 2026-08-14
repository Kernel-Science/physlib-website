import { TopRightArrowIcon } from "./icons";

export function PdfViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      {/* iOS renders an embedded PDF via its native PDFKit view, whose
          gesture recognizer reliably fails to respond to touch when nested
          inside a scrolling page - no CSS/HTML fix for that, so below `lg`
          skip the dead unscrollable box and send touch devices to the PDF's
          own tab instead, where the real full-screen viewer scrolls fine. */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface-secondary/30 lg:block">
        <iframe
          src={url}
          title={title}
          scrolling="yes"
          className="h-[80vh] min-h-[600px] w-full"
          style={{ WebkitOverflowScrolling: "touch" }}
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border p-8 text-sm text-muted lg:hidden"
      >
        Open the PDF in a new tab to read it on mobile devices
        <TopRightArrowIcon />
      </a>
    </div>
  );
}
