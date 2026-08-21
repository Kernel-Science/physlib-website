"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiMapNode } from "@/lib/yaml";
import { GitHubIcon } from "@/components/monthly-updates/icons";

/** The site's one filled "does a thing on GitHub" button style - same
 *  black/white tokens and layout as the navbar's own GitHub button, so
 *  these dialogs hand off to GitHub looking like every other GitHub link on
 *  the site rather than inventing their own accent-colored variant.
 *
 *  `ready` fades it to 40% with no hover brightening, standing in for a
 *  disabled look - but it's never actually the `disabled` attribute, since
 *  a truly disabled element can't be clicked, and clicking while incomplete
 *  is exactly what's supposed to redden the empty fields below. Hover was
 *  deliberately left out of the faded state: `hover:opacity-80` would have
 *  beaten the fade the moment the pointer landed on the button to click it -
 *  the one moment the grey cue most needs to hold. */
function githubButtonClasses(ready: boolean): string {
  const base = "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity";
  return ready ? `${base} hover:opacity-80` : `${base} opacity-40`;
}
const githubButtonStyle = {
  background: "var(--github-button-bg)",
  color: "var(--github-button-fg)",
  letterSpacing: "-0.01em",
} as const;

/** Known to exist on the repo - it's the label the API issues already use. */
const ISSUE_LABEL = "API";
/** GitHub starts rejecting very long URLs; the Physlib Verso wiki, which this
 *  flow mirrors, uses the same ceiling before falling back to the clipboard.
 *  Leaves room for roughly 5,000 characters of typed text once percent-
 *  encoding expands it. */
const MAX_URL_LENGTH = 7500;

export type SuggestKind = "requirement" | "overview";
type SuggestTab = "issue" | "pr";

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

/** The two-way switch at the top of every dialog: file an issue for a
 *  maintainer to act on, or make the change directly on GitHub yourself. */
function TabSwitcher({
  tab,
  setTab,
}: {
  tab: SuggestTab;
  setTab: (t: SuggestTab) => void;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface-secondary/40 p-1">
      {(["issue", "pr"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === t
              ? "bg-surface text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          {t === "issue" ? "Create a GitHub issue" : "Change the code directly"}
        </button>
      ))}
    </div>
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
      prHint: "the Overview field",
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
    prHint: "the Requirements list",
    firstTip: {
      term: "Describe.",
      text: "Write the requirement as one sentence, in the style of the existing ones. Most begin: “The API shall contain…”.",
    },
  };
}

/** Indents every non-blank line of a block by `spaces`, for embedding
 *  free-typed text inside a YAML block scalar (`|`) - used to prefill a
 *  brand-new `API-map.yaml`, where GitHub can take the whole file as a query
 *  param. Blank lines are left bare rather than padded, matching how YAML
 *  tooling itself formats block scalars and avoiding trailing-whitespace
 *  diffs. */
function indentBlock(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line.length ? pad + line : ""))
    .join("\n");
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
  branch,
  kind,
}: {
  node: ApiMapNode;
  repo: string;
  branch: string;
  kind: SuggestKind;
}) {
  const c = config(kind, node);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<SuggestTab>("issue");
  const [text, setText] = useState(c.initialText);
  const [why, setWhy] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);
  // Set only inside submitIssue, on a failed attempt - never cleared by
  // typing, so the red border stays put until the reader clicks again and
  // it's re-checked (and cleared, if they've since fixed it).
  const [textInvalid, setTextInvalid] = useState(false);

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
    setTab("issue");
    setText(kind === "overview" ? node.overview : "");
    setWhy("");
    setCopiedNotice(false);
    setTextInvalid(false);
  }, [node.path, node.overview, kind]);

  const filePath = `${node.path}/API-map.yaml`;
  // /edit/ always loads the file's real contents - GitHub has no query param
  // that prefills an edit the way it does a brand-new file - so this just
  // gets the reader into the real editor; they write the change there.
  const editUrl = `https://github.com/${repo}/edit/${branch}/${filePath}`;

  const submitIssue = async () => {
    if (text.trim().length === 0) {
      setTextInvalid(true);
      return;
    }
    setTextInvalid(false);
    // Filed but unchanged: not a missing field, just nothing new to
    // propose - the hint below the field already says so.
    if (kind === "overview" && text.trim() === node.overview.trim()) return;

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
    } else {
      setCopiedNotice(false);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const filled = text.trim().length > 0;
  // Proposing the overview back unchanged would file a no-op issue.
  const unchanged = kind === "overview" && text.trim() === node.overview.trim();
  // Greyed out when there's nothing to submit yet - but never actually
  // `disabled`: a disabled button can't be clicked at all, and clicking
  // while empty is exactly what's supposed to redden the field.
  const ready = filled && !unchanged;

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

        <div className="shrink-0 px-6">
          <TabSwitcher tab={tab} setTab={setTab} />
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
        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4">
          <p className="text-sm leading-relaxed text-muted">
            For <span className="text-foreground">{node.title}</span>.{" "}
            {kind === "overview" ? (
              <>
                You are improving the plain-English explanation of what this API
                is for.
              </>
            ) : (
              <>
                You are describing what the API <em>should</em> contain, in
                plain English.
              </>
            )}{" "}
          </p>

          {tab === "issue" ? (
            <>
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
                    A short explanation telling a maintainer why it matters
                    makes a suggestion much easier to understand.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      Submit.
                    </span>{" "}
                    The button opens GitHub with everything filled in; you
                    press <em>Submit new issue</em>.
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
                  className={`mt-1.5 w-full resize-y rounded-lg border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent ${
                    textInvalid ? "border-red-500" : "border-border"
                  }`}
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

              <p className="mt-4 text-xs leading-relaxed text-muted">
                Submitting opens GitHub in a new tab. You must be signed in to
                a GitHub account to post the suggestion; if it&apos;s
                accepted, you&apos;ll be credited as a co-author.
              </p>

              {copiedNotice && (
                <p className="mt-2 text-xs text-muted">
                  Your suggestion was too long to prefill, so it has been
                  copied to your clipboard — paste it into the issue body.
                </p>
              )}

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-3">
                  {unchanged && filled && (
                    <p className="text-xs text-muted">
                      Make an edit above to propose a change.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={submitIssue}
                    className={githubButtonClasses(ready)}
                    style={githubButtonStyle}
                  >
                    <GitHubIcon />
                    Create issue
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Edit{" "}
                <code className="rounded bg-surface-secondary px-1 py-0.5">
                  {filePath}
                </code>{" "}
                directly on GitHub: update {c.prHint}, then commit. GitHub
                forks the repo for you and opens a pull request automatically.
                You&apos;ll need to be signed in to a GitHub account.
              </p>

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <a
                  href={editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={githubButtonClasses(true)}
                  style={githubButtonStyle}
                >
                  <GitHubIcon />
                  Edit on GitHub
                </a>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

/** Everything the "suggest a new API" flow needs to build both the issue
 *  body and the file that would land at `{path}/API-map.yaml`. */
function buildNewApiBody({
  title,
  path,
  overview,
  why,
}: {
  title: string;
  path: string;
  overview: string;
  why: string;
}): string {
  return [
    "### New API",
    "",
    `**Title:** ${title.trim()}`,
    `**Suggested location:** \`${path.trim()}/API-map.yaml\``,
    "",
    "### Overview",
    "",
    overview.trim(),
    "",
    "### Why",
    "",
    why.trim() || "_Not given._",
    "",
    "---",
    "",
    "_If this suggestion is accepted, please credit the issue author as a " +
      "co-author of the change (`Co-authored-by:`)._",
    "",
    "---",
    "*Suggested from the Physlib API tracker.*",
    "",
  ].join("\n");
}

/** The full contents of a brand-new `API-map.yaml`. Unlike editing an
 *  existing file, GitHub's new-file editor takes the whole file as a query
 *  param, so this can be written out complete rather than pasted in by
 *  hand. */
function buildNewApiYaml(title: string, overview: string): string {
  return [
    `Title: ${JSON.stringify(title.trim())}`,
    "Overview: |",
    indentBlock(overview.trim(), 2),
    "ParentAPIs: []",
    "References: []",
    "Requirements: []",
  ].join("\n");
}

export function SuggestNewApiDialog({
  repo,
  branch,
  existingPaths,
  initialPath = "",
  initialTitle = "",
  triggerLabel = "Suggest a new API",
}: {
  repo: string;
  branch: string;
  /** Paths that already have an `API-map.yaml` - used to warn about
   *  collisions rather than silently proposing a duplicate. */
  existingPaths: string[];
  /** Set when opened from a "referenced but not written yet" box: the path
   *  is already known from whoever lists it as a parent. Still editable -
   *  ParentAPIs entries are sometimes a bare `.lean` file rather than the
   *  API's directory, so the guess may need correcting. */
  initialPath?: string;
  initialTitle?: string;
  triggerLabel?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<SuggestTab>("issue");
  const [title, setTitle] = useState(initialTitle);
  const [path, setPath] = useState(initialPath);
  const [overview, setOverview] = useState("");
  const [why, setWhy] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);
  // Set only by validateRequired, on a failed attempt - never cleared by
  // typing, so a red border stays put until the reader clicks again.
  const [titleInvalid, setTitleInvalid] = useState(false);
  const [pathInvalid, setPathInvalid] = useState(false);
  const [overviewInvalid, setOverviewInvalid] = useState(false);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  // A fresh phantom (or a fresh "suggest new" click elsewhere) shouldn't
  // inherit whatever the reader was typing about a different API.
  useEffect(() => {
    dialogRef.current?.close();
    setTab("issue");
    setTitle(initialTitle);
    setPath(initialPath);
    setOverview("");
    setWhy("");
    setCopiedNotice(false);
    setTitleInvalid(false);
    setPathInvalid(false);
    setOverviewInvalid(false);
  }, [initialPath, initialTitle]);

  const cleanPath = path.trim().replace(/^\/+|\/+$/g, "");
  const collides = existingPaths.includes(cleanPath);
  const filled =
    title.trim().length > 0 && cleanPath.length > 0 && overview.trim().length > 0;
  // Greyed out when there's nothing submittable yet - but never actually
  // `disabled`: a disabled element can't be clicked at all, and clicking
  // while incomplete is exactly what's supposed to redden the empty fields.
  const ready = filled && !collides;

  // Shared by both tabs' actions: mark whichever required fields are still
  // empty (so their border goes red) and report whether it's safe to
  // proceed. Called only at click time, never on every keystroke.
  const validateRequired = () => {
    const missingTitle = title.trim().length === 0;
    const missingPath = cleanPath.length === 0;
    const missingOverview = overview.trim().length === 0;
    setTitleInvalid(missingTitle);
    setPathInvalid(missingPath);
    setOverviewInvalid(missingOverview);
    return !missingTitle && !missingPath && !missingOverview;
  };

  const issueTitle = `API-map: new API — ${title.trim() || "untitled"}`;
  const filePath = `${cleanPath}/API-map.yaml`;

  // GitHub's new-file editor takes both the path and the file's whole
  // contents as query params - Title, Path and Overview above feed straight
  // into it, so the reader lands on a filled-in editor and only has to press
  // Commit. It forks the repo for them on the way through.
  //
  // The base stays bare (`/new/{branch}` with no trailing path): once
  // `filename` is set GitHub drops the last folder segment of the URL path,
  // so carrying the directory in `filename` alone is what actually lands the
  // file where it was asked for.
  const newFileBase = `https://github.com/${repo}/new/${branch}`;
  const newFileNameParam = `?filename=${encodeURIComponent(filePath)}`;
  const newFileWithValue =
    `${newFileBase}${newFileNameParam}` +
    `&value=${encodeURIComponent(buildNewApiYaml(title, overview))}`;
  // Same ceiling as the issue flow. Dropping just the contents keeps the
  // path prefilled; the reader can still fill the file in by hand.
  const newFileUrl =
    newFileWithValue.length <= MAX_URL_LENGTH
      ? newFileWithValue
      : `${newFileBase}${newFileNameParam}`;

  const submitIssue = async () => {
    if (!validateRequired()) return;
    // A colliding path already has its own warning under the Path field;
    // nothing more to say here.
    if (collides) return;

    const body = buildNewApiBody({ title, path: cleanPath, overview, why });
    const base =
      `https://github.com/${repo}/issues/new` +
      `?labels=${encodeURIComponent(ISSUE_LABEL)}` +
      `&title=${encodeURIComponent(issueTitle)}`;
    let url = `${base}&body=${encodeURIComponent(body)}`;

    if (url.length > MAX_URL_LENGTH) {
      try {
        await navigator.clipboard.writeText(body);
        setCopiedNotice(true);
      } catch {
        /* clipboard blocked - the form still opens, just empty */
      }
      url = base;
    } else {
      setCopiedNotice(false);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // The pull-request link stays a real <a href> (so it's a genuine link -
  // hover preview, open-in-new-tab, the works) rather than a button that
  // calls window.open; a click handler just cancels the navigation when
  // required fields are still empty.
  const handleOpenPullRequest = (e: React.MouseEvent) => {
    if (!validateRequired() || collides) e.preventDefault();
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span aria-hidden>✎</span>
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) closeDialog();
        }}
        className="m-auto max-h-[85vh] w-[min(38rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 open:flex"
      >
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-6">
          <h2 className="text-lg font-semibold tracking-tight">Suggest a new API</h2>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Close"
            className="-mr-1.5 shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="shrink-0 px-6">
          <TabSwitcher tab={tab} setTab={setTab} />
        </div>

        <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4">
          <p className="text-sm leading-relaxed text-muted">
            {initialPath ? (
              <>
                This API is referenced elsewhere but has no{" "}
                <code>API-map.yaml</code> of its own yet.
              </>
            ) : (
              <>
                Propose an <code>API-map.yaml</code> for an API that
                isn&apos;t tracked here yet.
              </>
            )}{" "}
          </p>

          {/* Title, Path and Overview feed both flows - the issue body and
              the pull request's prefilled file - so they live above the tabs
              and stay filled in when the reader switches between them. */}
          <label className="mt-4 block">
            <span className="text-xs font-medium">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Minkowski Metric"
              className={`mt-1.5 w-full rounded-lg border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent ${
                titleInvalid ? "border-red-500" : "border-border"
              }`}
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-medium">
              Path{" "}
              <span className="font-normal text-muted">
                (directory in the repo, matching how other APIs reference it
                in <code>ParentAPIs</code>)
              </span>
            </span>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="e.g. Physlib/Relativity/MinkowskiMetric"
              className={`mt-1.5 w-full rounded-lg border bg-surface-secondary/40 p-2.5 font-mono text-sm outline-none placeholder:text-muted/50 focus:border-accent ${
                pathInvalid ? "border-red-500" : "border-border"
              }`}
            />
            {collides && (
              <span className="mt-1 block text-xs text-red-500">
                An API-map.yaml already exists at this path — use the
                overview or requirement suggestion on that API instead.
              </span>
            )}
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-medium">Overview</span>
            <textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              rows={4}
              placeholder="Describe what this API is for…"
              className={`mt-1.5 w-full resize-y rounded-lg border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent ${
                overviewInvalid ? "border-red-500" : "border-border"
              }`}
            />
          </label>

          {tab === "issue" ? (
            <>
              <label className="mt-3 block">
                <span className="text-xs font-medium">
                  Why{" "}
                  <span className="font-normal text-muted">(optional)</span>
                </span>
                <input
                  value={why}
                  onChange={(e) => setWhy(e.target.value)}
                  placeholder="What does this add?"
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
                />
              </label>

              <p className="mt-4 text-xs leading-relaxed text-muted">
                Submitting opens GitHub in a new tab. You must be signed in to
                a GitHub account to post the suggestion; if it&apos;s
                accepted, you&apos;ll be credited as a co-author.
              </p>

              {copiedNotice && (
                <p className="mt-2 text-xs text-muted">
                  Your suggestion was too long to prefill, so it has been
                  copied to your clipboard — paste it into the issue body.
                </p>
              )}

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitIssue}
                  className={githubButtonClasses(ready)}
                  style={githubButtonStyle}
                >
                  <GitHubIcon />
                  Create issue
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                This opens a new file on GitHub, prefilled with the text
                above - add any extra information and commit. GitHub forks the repo for you
                and opens a pull request automatically. You&apos;ll need to
                be signed in to a GitHub account.
              </p>

              <div className="mt-5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <a
                  href={newFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenPullRequest}
                  className={githubButtonClasses(ready)}
                  style={githubButtonStyle}
                >
                  <GitHubIcon />
                  Open a pull request
                </a>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
