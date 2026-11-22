"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/monthly-updates/icons";
import { PREAMBLE } from "./preamble";

export function PreambleSection() {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(PREAMBLE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API can reject in insecure contexts or without permission;
      // the text is still visible and selectable below, so no-op.
    }
  }

  return (
    <div>
      <p
        className="mb-4 text-sm leading-relaxed"
        style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}
      >
        The preamble is a fixed block of setup instructions. This lets your agent know how to install Physlib on your device and make a GitHub pull request.
      </p>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted/80">
          Preamble text
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-(--radius) border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-accent"
        >
          {copied ? (
            <>
              <CheckIcon className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="size-3.5" />
              Copy preamble
            </>
          )}
        </button>
      </div>
      <p className="max-h-72 select-text overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-xs leading-relaxed text-foreground/90">
        {PREAMBLE.trim()}
      </p>
    </div>
  );
}
