"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiMapNode } from "@/lib/yaml";
import { TopRightArrowIcon } from "@/components/monthly-updates/icons";

/** Known to exist on the repo - it's the label the API issues already use. */
const ISSUE_LABEL = "API";
/** GitHub starts rejecting very long URLs; the Physlib Verso wiki, which this
 *  flow mirrors, uses the same ceiling before falling back to the clipboard.
 *  Leaves room for roughly 5,000 characters of typed text once percent-
 *  encoding expands it. */
const MAX_URL_LENGTH = 7500;

export type SuggestKind = "requirement" | "overview";

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
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6l12 12M18 6L6 18"
      />
    </svg>
  );
}

/** Everything that differs between the two suggestion flows. The modal shell,
 *  the issue-URL assembly and the clipboard fallback are shared below. */
function config(kind: SuggestKind, node: ApiMapNode) {
  if (kind === "overview") {
    return {
      buttonLabel: "Suggest overview change",
      heading: "Suggest a change to the overview",
      // Pre-loaded with the current text so the reader edits rather than
      // rewrites from scratch.
      initialText: node.overview,
      fieldLabel: "The overview",
      placeholder: "Describe what this API is for…",
      // Deliberately modest: the overview can run to several paragraphs, and
      // sizing the box to fit it makes the whole dialog tower over the
      // requirement one - which is what "too big" looks like on a window tall
      // enough that the 85vh cap isn't hiding the difference. Four rows puts
      // the two dialogs at the same height; the text scrolls internally, and
      // resize-y lets anyone who wants more room drag it taller.
      rows: 4,
      issueTitle: `API-map: overview update for ${node.title}`,
      bodyHeading: "### Suggested overview",
      bodyNote: "This replaces the `Overview` field of the API map below.",
      firstTip: {
        term: "Edit.",
        text: "The current overview is loaded below. Please change the parts you want to improve.",
      },
    };
  }
  return {
    buttonLabel: "Suggest new requirement",
    heading: "Suggest a new requirement",
    initialText: "",
    fieldLabel: "The requirement",
    placeholder: "The API shall contain…",
    rows: 3,
    issueTitle: `API-map: new requirement for ${node.title}`,
    bodyHeading: "### Suggested new requirement",
    bodyNote: null as string | null,
    firstTip: {
      term: "Describe.",
      text: "Write the requirement as one sentence, in the style of the existing ones. Most begin: “The API shall contain…”.",
    },
  };
}

function buildIssueBody({
  node,
  text,
  why,
  bodyHeading,
  bodyNote,
}: {
  node: ApiMapNode;
  text: string;
  why: string;
  bodyHeading: string;
  bodyNote: string | null;
}): string {
  const done = node.requirements.filter((r) => r.done).length;
  return [
    bodyHeading,
    "",
    ...(bodyNote ? [bodyNote, ""] : []),
    text.trim(),
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

export function SuggestDialog({
  node,
  repo,
  kind,
}: {
  node: ApiMapNode;
  repo: string;
  kind: SuggestKind;
}) {
  const c = config(kind, node);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [text, setText] = useState(c.initialText);
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
  // attached to the wrong one - and, for the overview, showing the previous
  // API's text.
  useEffect(() => {
    dialogRef.current?.close();
    setText(kind === "overview" ? node.overview : "");
    setWhy("");
    setCopiedNotice(false);
  }, [node.path, node.overview, kind]);

  const propose = async () => {
    const body = buildIssueBody({
      node,
      text,
      why,
      bodyHeading: c.bodyHeading,
      bodyNote: c.bodyNote,
    });
    const base =
      `https://github.com/${repo}/issues/new` +
      `?labels=${encodeURIComponent(ISSUE_LABEL)}` +
      `&title=${encodeURIComponent(c.issueTitle)}`;
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

  const filled = text.trim().length > 0;
  // Proposing the overview back unchanged would file a no-op issue.
  const unchanged = kind === "overview" && text.trim() === node.overview.trim();
  const canPropose = filled && !unchanged;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span aria-hidden>✎</span>
        {c.buttonLabel}
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
        //
        // The height cap and the column layout live on the <dialog> itself
        // rather than on an inner wrapper: Safari's UA stylesheet gives
        // dialog its own max-height and overflow:auto, and a wrapper leaves
        // those fighting the wrapper's cap. overflow-hidden also stops Safari
        // adding a second scrollbar outside the rounded corners.
        //
        // `open:flex`, never a bare `flex`: a closed dialog is hidden by the
        // UA rule `dialog:not([open]) { display: none }`, and any author-level
        // display would beat it and leave both dialogs permanently rendered
        // inline in the page.
        className="m-auto max-h-[85vh] w-[min(38rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 open:flex"
      >
        {/* Only the title row is pinned outside the scrolling region - just
            enough to keep the close button reachable on a short window and
            clear of that region's scrollbar. */}
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-6">
          <h2 className="text-lg font-semibold tracking-tight">{c.heading}</h2>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Close"
            className="-mr-1.5 shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        {/* min-h-0 is load-bearing: a flex item's min-height defaults to auto,
            so without it this box cannot shrink below its content and
            overflow-y never engages - the dialog grows to full content height
            instead of scrolling.
            Deliberately NOT flex-1: that sets flex-basis to 0%, a hypothetical
            main size of zero, and since the dialog's own height is auto the
            container is then free to resolve to just the header - Safari does
            exactly that and the dialog collapses to a sliver. With basis auto
            it sizes to its content and only shrinks once max-h-[85vh] bites,
            which is all that was ever wanted. */}
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-1">
          <p className="text-sm leading-relaxed text-muted">
            For <span className="text-foreground">{node.title}</span>.{" "}
            {kind === "overview" ? (
              <>
                You are improving the plain-English explanation of what this API
                is for. You do not need to know any Lean.
              </>
            ) : (
              <>
                You are describing what the API <em>should</em> contain, in
                plain English. You do not need to know any Lean.
              </>
            )}{" "}
            Submitting opens a prefilled GitHub issue for a maintainer to look
            at. You may also make a pull request linked to the issue if you
            would like to implement the change yourself.
          </p>

          <div className="mt-4 rounded-lg border border-border bg-surface-secondary/50 p-4">
            <p className="mb-2 text-xs font-semibold">Helpful tips:</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-muted">
              <li>
                <span className="font-medium text-foreground">
                  {c.firstTip.term}
                </span>{" "}
                {c.firstTip.text}
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Say why (optional).
                </span>{" "}
                A short explanation telling a maintainer why it matters makes a
                suggestion much easier to understand.
              </li>
              <li>
                <span className="font-medium text-foreground">Propose.</span>{" "}
                The button opens GitHub with everything filled in; you press{" "}
                <em>Submit new issue</em>.
              </li>
            </ol>
          </div>

          <label className="mt-5 block">
            <span className="text-xs font-medium">{c.fieldLabel}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={c.rows}
              placeholder={c.placeholder}
              className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-medium">
              Why the change?{" "}
              <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="What does this improve?"
              className="mt-1.5 w-full rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
            />
          </label>

          <p className="mt-4 rounded-lg border border-border bg-surface-secondary/50 p-3 text-xs leading-relaxed text-muted">
            Submitting opens GitHub in a new tab. You must be{" "}
            <span className="font-medium text-foreground">
              signed in to a GitHub account
            </span>{" "}
            to post the suggestion. If your suggestion is accepted, you&apos;ll
            be credited as a co-author.
          </p>

          {copiedNotice && (
            <p className="mt-2 text-xs text-muted">
              Your suggestion was too long to prefill, so it has been copied to
              your clipboard — paste it into the issue body.
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            {unchanged && filled && (
              <p className="mr-auto text-xs text-muted">
                Make an edit above to propose a change.
              </p>
            )}
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
      </dialog>
    </>
  );
}
