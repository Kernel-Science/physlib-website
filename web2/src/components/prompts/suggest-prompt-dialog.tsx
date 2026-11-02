"use client";

import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";
import {
  CloseIcon,
  GitHubIcon,
  MAX_URL_LENGTH,
  TabSwitcher,
  githubButtonClasses,
  githubButtonStyle,
  type SuggestTab,
} from "@/components/suggest-dialog-shared";

// Prompts live as a hand-written array in this website's own repo, not in
// generated data pulled from Physlib itself - so, unlike the Atlas article's
// suggest flow, edits here point at the website repo, not site.github.
const REPO = site.websiteRepo.replace(/^https:\/\/github\.com\//, "");
const BRANCH = "main";
const FILE_PATH = "web2/src/app/prompts/prompts-client.tsx";
const editUrl = `https://github.com/${REPO}/edit/${BRANCH}/${FILE_PATH}`;

function buildFooter(promptRef: string): string {
  return [
    "---",
    "",
    `**File:** \`${FILE_PATH}\` (${promptRef})`,
    "",
    "_If this suggestion is accepted, please credit the issue author as a " +
      "co-author of the change (`Co-authored-by:`)._",
    "",
    "---",
    "*Suggested from the Physlib prompt library.*",
    "",
  ].join("\n");
}

async function openIssue({
  title,
  body,
  setCopiedNotice,
}: {
  title: string;
  body: string;
  setCopiedNotice: (v: boolean) => void;
}) {
  const base =
    `https://github.com/${REPO}/issues/new` +
    `?title=${encodeURIComponent(title)}`;
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
}

/** Shared shell: title bar, tab switcher, and the "change it yourself on
 *  GitHub" tab, which - same as the Atlas article's suggest flow - just hands off
 *  to the real editor rather than trying to prefill a diff GitHub has no
 *  query param for. */
function DialogShell({
  dialogRef,
  heading,
  closeDialog,
  tab,
  setTab,
  prTabCopy,
  children,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  heading: string;
  closeDialog: () => void;
  tab: SuggestTab;
  setTab: (t: SuggestTab) => void;
  prTabCopy: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) closeDialog();
      }}
      className="m-auto max-h-[85vh] w-[min(38rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50 open:flex"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 px-6 pt-6">
        <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
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
        {tab === "issue" ? (
          children
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {prTabCopy}
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
  );
}

/** Per-prompt-card button: suggest a change to that prompt's wording. */
export function SuggestPromptEditDialog({
  promptId,
  promptTitle,
  currentText,
}: {
  promptId: string;
  promptTitle: string;
  currentText: string;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<SuggestTab>("issue");
  const [text, setText] = useState("");
  const [why, setWhy] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [textInvalid, setTextInvalid] = useState(false);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  useEffect(() => {
    dialogRef.current?.close();
    setTab("issue");
    setText("");
    setWhy("");
    setCopiedNotice(false);
    setTextInvalid(false);
  }, [promptId]);

  const filled = text.trim().length > 0;

  const submitIssue = async () => {
    if (!filled) {
      setTextInvalid(true);
      return;
    }
    setTextInvalid(false);

    const body = [
      "### Suggested prompt text",
      "",
      text.trim(),
      "",
      "### Current text",
      "",
      "```",
      currentText,
      "```",
      "",
      "### Why",
      "",
      why.trim() || "_Not given._",
      "",
      buildFooter(`prompt id: \`${promptId}\``),
    ].join("\n");

    await openIssue({
      title: `Prompts: edit "${promptTitle}"`,
      body,
      setCopiedNotice,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span aria-hidden>✎</span>
        Suggest edit
      </button>

      <DialogShell
        dialogRef={dialogRef}
        heading={`Suggest an edit to "${promptTitle}"`}
        closeDialog={closeDialog}
        tab={tab}
        setTab={setTab}
        prTabCopy={
          <>
            Edit <code className="rounded bg-surface-secondary px-1 py-0.5">{FILE_PATH}</code>{" "}
            directly on GitHub: find the prompt with id <code className="rounded bg-surface-secondary px-1 py-0.5">{promptId}</code>{" "}
            in the <code className="rounded bg-surface-secondary px-1 py-0.5">PROMPTS</code> array
            and update its <code className="rounded bg-surface-secondary px-1 py-0.5">template</code>,
            then commit. GitHub forks the repo for you and opens a pull
            request automatically. You&apos;ll need to be signed in to a
            GitHub account.
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          For <span className="text-foreground">{promptTitle}</span>. Describe
          how the prompt&apos;s wording should change.
        </p>

        <label className="mt-4 block">
          <span className="text-xs font-medium">Suggested text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Rewrite the prompt as you'd like it to read…"
            className={`mt-1.5 w-full resize-y rounded-lg border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent ${
              textInvalid ? "border-red-500" : "border-border"
            }`}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-medium">
            Why the change? <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="What does this improve?"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
          />
        </label>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Submitting opens GitHub in a new tab. You must be signed in to a
          GitHub account to post the suggestion; if it&apos;s accepted,
          you&apos;ll be credited as a co-author.
        </p>

        {copiedNotice && (
          <p className="mt-2 text-xs text-muted">
            Your suggestion was too long to prefill, so it has been copied to
            your clipboard — paste it into the issue body.
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
            className={githubButtonClasses(filled)}
            style={githubButtonStyle}
          >
            <GitHubIcon />
            Create issue
          </button>
        </div>
      </DialogShell>
    </>
  );
}

/** Page-level button: propose an entirely new prompt for the library. */
export function SuggestNewPromptDialog() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [tab, setTab] = useState<SuggestTab>("issue");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [template, setTemplate] = useState("");
  const [why, setWhy] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [titleInvalid, setTitleInvalid] = useState(false);
  const [templateInvalid, setTemplateInvalid] = useState(false);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  const filled = title.trim().length > 0 && template.trim().length > 0;

  const validateRequired = () => {
    const missingTitle = title.trim().length === 0;
    const missingTemplate = template.trim().length === 0;
    setTitleInvalid(missingTitle);
    setTemplateInvalid(missingTemplate);
    return !missingTitle && !missingTemplate;
  };

  const submitIssue = async () => {
    if (!validateRequired()) return;

    const body = [
      "### New prompt",
      "",
      `**Title:** ${title.trim()}`,
      `**Summary:** ${summary.trim() || "_Not given._"}`,
      "",
      "### Prompt text",
      "",
      "```",
      template.trim(),
      "```",
      "",
      "_Use the same working-folder placeholder as the other prompts (see the existing entries in the file)._",
      "",
      "### Why",
      "",
      why.trim() || "_Not given._",
      "",
      buildFooter("new prompt"),
    ].join("\n");

    await openIssue({
      title: `Prompts: new prompt — ${title.trim() || "untitled"}`,
      body,
      setCopiedNotice,
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
      >
        <span aria-hidden>✎</span>
        Suggest a new prompt
      </button>

      <DialogShell
        dialogRef={dialogRef}
        heading="Suggest a new prompt"
        closeDialog={closeDialog}
        tab={tab}
        setTab={setTab}
        prTabCopy={
          <>
            Edit <code className="rounded bg-surface-secondary px-1 py-0.5">{FILE_PATH}</code>{" "}
            directly on GitHub: add a new entry to the{" "}
            <code className="rounded bg-surface-secondary px-1 py-0.5">PROMPTS</code>{" "}
            array following the existing pattern, then commit. GitHub forks
            the repo for you and opens a pull request automatically.
            You&apos;ll need to be signed in to a GitHub account.
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          Propose a new ready-made prompt for the library.
        </p>

        <label className="mt-4 block">
          <span className="text-xs font-medium">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Test coverage"
            className={`mt-1.5 w-full rounded-lg border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent ${
              titleInvalid ? "border-red-500" : "border-border"
            }`}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-medium">Summary</span>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One line describing what the prompt does"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-medium">
            Prompt text{" "}
            <span className="font-normal text-muted">
              (use <code>{"${folder}"}</code> where the working folder should go)
            </span>
          </span>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={4}
            placeholder={"Look through `${folder}` and…"}
            className={`mt-1.5 w-full resize-y rounded-lg border bg-surface-secondary/40 p-2.5 font-mono text-sm outline-none placeholder:text-muted/50 focus:border-accent ${
              templateInvalid ? "border-red-500" : "border-border"
            }`}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs font-medium">
            Why <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="What does this add to the library?"
            className="mt-1.5 w-full rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
          />
        </label>

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Submitting opens GitHub in a new tab. You must be signed in to a
          GitHub account to post the suggestion; if it&apos;s accepted,
          you&apos;ll be credited as a co-author.
        </p>

        {copiedNotice && (
          <p className="mt-2 text-xs text-muted">
            Your suggestion was too long to prefill, so it has been copied to
            your clipboard — paste it into the issue body.
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
            className={githubButtonClasses(filled)}
            style={githubButtonStyle}
          >
            <GitHubIcon />
            Create issue
          </button>
        </div>
      </DialogShell>
    </>
  );
}
