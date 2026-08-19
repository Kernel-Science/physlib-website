"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiMapNode } from "@/lib/yaml";
import { TopRightArrowIcon } from "@/components/monthly-updates/icons";

/** Known to exist on the repo - it's the label the API issues already use. */
const ISSUE_LABEL = "API";
/** GitHub starts rejecting very long URLs; the Physlib Verso wiki, which this
 *  flow mirrors, uses the same ceiling before falling back to the clipboard. */
const MAX_URL_LENGTH = 7500;

function CloseIcon() {
  return (
    <svg
      aria-hidden
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function buildIssueBody({
  node,
  requirement,
  why,
}: {
  node: ApiMapNode;
  requirement: string;
  why: string;
}): string {
  const done = node.requirements.filter((r) => r.done).length;
  return [
    "### Suggested new requirement",
    "",
    requirement.trim(),
    "",
    "### Why",
    "",
    why.trim() || "_Not given._",
    "",
    "---",
    "",
    `**API:** ${node.title} (\`${node.path}\`)`,
    `**API map:** ${node.url}`,
    `**Currently:** ${done} of ${node.requirements.length} requirements done.`,
    "",
    "_If this suggestion is accepted, please credit the issue author as a " +
      "co-author of the change (`Co-authored-by:`)._",
    "",
    "---",
    "*Suggested from the Physlib API tracker.*",
    "",
  ].join("\n");
}

export function SuggestRequirementDialog({
  node,
  repo,
}: {
  node: ApiMapNode;
  repo: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [requirement, setRequirement] = useState("");
  const [why, setWhy] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Openness lives on the element, never mirrored into React state. Mirroring
  // it desyncs: Esc closes the dialog natively and sets the state false, and
  // if a reopen lands in the same batch the value nets out unchanged, so
  // React skips the render whose effect would have called showModal() - and
  // the dialog can never be reopened. showModal() is what provides the focus
  // trap, Esc-to-close and inert backdrop.
  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  // Switching to a different API would leave a half-written suggestion
  // attached to the wrong one.
  useEffect(() => {
    dialogRef.current?.close();
    setRequirement("");
    setWhy("");
    setCopiedNotice(false);
  }, [node.path]);

  const propose = async () => {
    const body = buildIssueBody({ node, requirement, why });
    const base =
      `https://github.com/${repo}/issues/new` +
      `?labels=${encodeURIComponent(ISSUE_LABEL)}` +
      `&title=${encodeURIComponent(`API-map: new requirement for ${node.title}`)}`;
    let url = `${base}&body=${encodeURIComponent(body)}`;

    if (url.length > MAX_URL_LENGTH) {
      // Too long to prefill; hand the reader the text so nothing they wrote
      // is lost when the blank form opens.
      try {
        await navigator.clipboard.writeText(body);
        setCopiedNotice(true);
      } catch {
        /* clipboard blocked - the form still opens, just empty */
      }
      url = base;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const canPropose = requirement.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span aria-hidden>✎</span>
        Suggest new requirement
      </button>

      <dialog
        ref={dialogRef}
        // Clicking the backdrop (the dialog element itself, outside the inner
        // panel) closes - matching the usual modal expectation.
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
        // m-auto restores the centring a modal <dialog> gets from the UA
        // stylesheet - Tailwind's preflight zeroes every element's margin,
        // which otherwise pins it to the top-left corner.
        className="m-auto w-[min(38rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50"
      >
        {/* Only the title row is pinned outside the scrolling region - just
            enough to keep the close button reachable on a short window and
            clear of that region's scrollbar. Keeping the blurb in the scroll
            area instead leaves the panel's proportions as they were before
            the button existed. */}
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-4 px-6 pt-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Suggest a new requirement
            </h2>
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close"
              className="-mr-1.5 shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="overflow-y-auto px-6 pb-6 pt-1">
          <p className="text-sm leading-relaxed text-muted">
            For <span className="text-foreground">{node.title}</span>. You are
            describing what the API <em>should</em> contain, in plain English —
            you do not need to know any Lean. Submitting opens a prefilled
            GitHub issue for a maintainer to review.
          </p>

          <div className="mt-4 rounded-lg border border-border bg-surface-secondary/50 p-4">
            <p className="mb-2 text-xs font-semibold">
              First time? Here is exactly what happens
            </p>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-muted">
              <li>
                <span className="font-medium text-foreground">Describe.</span>{" "}
                Write the requirement as one sentence, in the style of the
                existing ones — most begin &ldquo;The API shall contain…&rdquo;.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Say why (optional).
                </span>{" "}
                One line telling a maintainer why it matters makes a suggestion
                much easier to accept.
              </li>
              <li>
                <span className="font-medium text-foreground">Propose.</span>{" "}
                The button opens GitHub with everything filled in; you press{" "}
                <em>Submit new issue</em>. Nothing is posted until you do.
              </li>
            </ol>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Nothing you do here can break the library: suggestions are
              reviewed before anything changes.
            </p>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-medium">The requirement</span>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              rows={3}
              placeholder="The API shall contain…"
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-medium">
              Why the change?{" "}
              <span className="font-normal text-muted">(optional, one line)</span>
            </span>
            <input
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="What does this improve?"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
            />
          </label>

          <p className="mt-4 rounded-lg border border-border bg-surface-secondary/50 p-3 text-xs leading-relaxed text-muted">
            🔒 Submitting opens GitHub in a new tab. You must be{" "}
            <span className="font-medium text-foreground">
              signed in to a GitHub account
            </span>{" "}
            to post the suggestion — it&apos;s free to{" "}
            <a
              href="https://github.com/signup"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline underline-offset-2"
            >
              create one
            </a>
            . If your suggestion is accepted, you&apos;ll be credited as a
            co-author.
          </p>

          {copiedNotice && (
            <p className="mt-2 text-xs text-muted">
              Your suggestion was too long to prefill, so it has been copied to
              your clipboard — paste it into the issue body.
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeDialog}
              className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={propose}
              disabled={!canPropose}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-40"
            >
              Propose on GitHub
              <TopRightArrowIcon className="size-3" />
            </button>
          </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
