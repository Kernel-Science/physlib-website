"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ApiMapLeanReference, ApiMapReference } from "@/lib/yaml";
import {
  backlinkLabel,
  buildArticle,
  diffHunks,
  lineDiff,
  parseArticleSource,
  parseFullApiMap,
  unifiedDiff,
} from "@/lib/api-map-article";
import { GitHubIcon, MAX_URL_LENGTH, githubButtonClasses, githubButtonStyle } from "@/components/suggest-dialog-shared";
import {
  ArticleBody,
  LeanReferenceList,
  LiteratureList,
  SectionHeading,
  Callout,
  useLinkedArticle,
} from "@/components/api-tracker/article-view";
import { ArticleContext, type ArticleContextValue } from "@/components/api-tracker/article-prose";
import type { IssueDraft, NewReference } from "@/lib/api-map-issue";

/**
 * The suggest-an-edit view: the section's markdown in a text box with a
 * small citation toolbar, Write / Preview / Changes views, and a reason for
 * the change. API maps live in the Physlib repository, so the edit is filed
 * as a GitHub issue for a maintainer - or, for those who prefer, handed to
 * GitHub's own editor to open a pull request.
 */

export type ArticleEditorProps = {
  /** Above the notice; left out when the page has its own heading. */
  heading?: React.ReactNode;
  notice: React.ReactNode;
  initial: string;
  /** What the Changes view and the issue's diff compare against, when not
   *  `initial` - empty for a new section, whose starting text is only a
   *  skeleton. */
  baseline?: string;
  /** How to read the text for the preview. */
  shape: "lead" | "section" | "article" | "new" | "file";
  context: ArticleContextValue;
  repo: string;
  issue: IssueDraft;
  /** Shown under the buttons - e.g. the "edit on GitHub instead" link. */
  footer?: React.ReactNode;
  /** Above the text box - e.g. the create page's location chooser. */
  before?: React.ReactNode;
  onCancel?: () => void;
  /** Extra check before publishing, returning a problem to show. */
  validate?: (text: string) => string | null;
  /** Told of every change to the text. */
  onTextChange?: (text: string) => void;
  /** Open with the new-reference form showing. */
  startAddingReference?: boolean;
};

function insertAt(el: HTMLTextAreaElement, snippet: string, set: (v: string) => void) {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const next = value.slice(0, s) + snippet + value.slice(e);
  set(next);
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(s + snippet.length, s + snippet.length);
  });
}

function CiteToolbar({
  leanReferences,
  references,
  insert,
  onNewReference,
}: {
  leanReferences: ApiMapLeanReference[];
  references: ApiMapReference[];
  insert: (snippet: string) => void;
  /** Absent where references are written into the text itself. */
  onNewReference?: () => void;
}) {
  const select =
    "max-w-[12rem] rounded-md border border-border bg-surface px-1.5 py-1 text-xs text-foreground outline-none focus:border-accent";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="label-mono text-muted/80">Cite</span>
      <select
        aria-label="Cite a Lean reference"
        className={select}
        value=""
        onChange={(e) => e.target.value && insert(` [${e.target.value}]`)}
      >
        <option value="">Lean declaration [n]…</option>
        {leanReferences.map((r) => (
          <option key={r.index} value={r.index}>
            [{r.index}] {r.file.split("/").slice(-2).join("/")} — {r.declarations.map((d) => d.text).join(", ").slice(0, 60)}
          </option>
        ))}
      </select>
      <select
        aria-label="Cite a reference"
        className={select}
        value=""
        onChange={(e) => {
          if (e.target.value === "new") onNewReference?.();
          else if (e.target.value) insert(` {${e.target.value}}`);
        }}
      >
        <option value="">Reference {"{n}"}…</option>
        {onNewReference && <option value="new">＋ New reference…</option>}
        {references.map((r) => (
          <option key={r.index} value={r.index}>
            {`{${r.index}}`} [{backlinkLabel(r.index - 1)}] {r.text.replace(/\*/g, "").slice(0, 70)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => insert(" [TODO]")}
        className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
        title="Mark the claim before the cursor as not yet formalized"
      >
        [TODO]
      </button>
    </div>
  );
}

/** Adding a literature reference: its text, in the style of the existing
 *  entries, and an optional link, appended to it as the entries do. */
function NewReferenceForm({
  index,
  onAdd,
  onCancel,
}: {
  index: number;
  onAdd: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [invalid, setInvalid] = useState(false);
  const input =
    "w-full rounded-lg border bg-surface px-2.5 py-1.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent";
  const add = () => {
    const t = text.trim().replace(/[.,]$/, "");
    if (!t) {
      setInvalid(true);
      return;
    }
    const l = link.trim();
    onAdd(l ? `${t}, ${l}` : `${t}.`);
  };
  return (
    <div className="border-b border-border bg-surface-secondary/30 px-3 py-3">
      <p className="mb-2 text-xs text-muted">
        New reference <code className="apimap-code">{`{${index}}`}</code>, cited where the cursor is.
        Italicize titles with <code className="apimap-code">*…*</code>; for another API map,
        write e.g. <code className="apimap-code">Time API map — Physlib/SpaceAndTime/Time/API-map.md</code>.
      </p>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Author, *Title*, publisher (year), chapter or section"
          aria-label="Reference"
          className={`${input} ${invalid ? "border-danger" : "border-border"}`}
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="https://… (optional)"
          aria-label="Link"
          className={`${input} border-border`}
        />
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-2 py-1 text-xs text-muted hover:text-foreground">
          Cancel
        </button>
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          Add and cite
        </button>
      </div>
    </div>
  );
}

function Preview({
  text,
  shape,
  context,
  showReferences = false,
}: {
  text: string;
  shape: ArticleEditorProps["shape"];
  context: ArticleContextValue;
  /** List the references below - on the create page, or when the edit adds
   *  some. */
  showReferences?: boolean;
}) {
  const parsed = useMemo(() => {
    if (shape === "file") return parseFullApiMap(text);
    if (shape === "lead") return { title: "", abstractHeading: "Abstract", abstract: text, content: [] };
    return { title: "", ...parseArticleSource(text) };
  }, [text, shape]);
  const article = useMemo(
    () => buildArticle(parsed.abstractHeading, parsed.abstract, parsed.content),
    [parsed],
  );
  const linked = useLinkedArticle(article, "preview");
  const ctx: ArticleContextValue =
    "leanReferences" in parsed
      ? { ...context, leanReferences: parsed.leanReferences, references: parsed.references }
      : context;
  return (
    <ArticleContext.Provider value={ctx}>
      <div>
        <p className="mb-4 text-xs text-muted">
          Preview - nothing has been submitted yet.
        </p>
        <div className="apimap-body">
          {parsed.title && <h1 className="mb-4 text-3xl font-bold tracking-tight">{parsed.title}</h1>}
          <ArticleBody linked={linked} />
          {shape === "file" && ctx.leanReferences.length > 0 && (
            <>
              <SectionHeading level={2}>Lean declarations</SectionHeading>
              <LeanReferenceList references={ctx.leanReferences} occurrences={linked.occurrences} />
            </>
          )}
          {(shape === "file" || showReferences) && ctx.references.length > 0 && (
            <>
              <SectionHeading level={2}>References</SectionHeading>
              <LiteratureList references={ctx.references} occurrences={linked.occurrences} />
            </>
          )}
        </div>
      </div>
    </ArticleContext.Provider>
  );
}

function Changes({ before, after }: { before: string; after: string }) {
  const hunks = useMemo(() => diffHunks(lineDiff(before, after), 2), [before, after]);
  if (before === after) {
    return <p className="text-sm text-muted">No changes yet.</p>;
  }
  return (
    <div className="apimap-diff" role="table" aria-label="Changes">
      {hunks.map((d, i) =>
        d === null ? (
          <div key={i} className="apimap-diff-gap">
            ⋯
          </div>
        ) : (
          <div key={i} className={`apimap-diff-line apimap-diff-${d.op === "+" ? "add" : d.op === "-" ? "del" : "ctx"}`}>
            <span aria-hidden className="apimap-diff-op">
              {d.op === " " ? "" : d.op === "+" ? "+" : "−"}
            </span>
            <span className="whitespace-pre-wrap break-words">{d.text || " "}</span>
          </div>
        ),
      )}
    </div>
  );
}

export function ArticleEditor({
  heading,
  notice,
  initial,
  baseline,
  shape,
  context,
  repo,
  issue,
  footer,
  before,
  onCancel,
  validate,
  onTextChange,
  startAddingReference = false,
}: ArticleEditorProps) {
  const [text, setText] = useState(initial);
  const [summary, setSummary] = useState("");
  const [view, setView] = useState<"write" | "preview" | "changes">("write");
  const [problem, setProblem] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [newReferences, setNewReferences] = useState<NewReference[]>([]);
  const [addingReference, setAddingReference] = useState(startAddingReference);
  const area = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    onTextChange?.(text);
  }, [text, onTextChange]);

  // References added here, numbered on from the map's own. On the create
  // page the reader writes the References section directly instead.
  const canAddReferences = shape !== "file";
  const nextReferenceIndex =
    Math.max(0, ...context.references.map((r) => r.index), ...newReferences.map((r) => r.index)) + 1;
  const editContext: ArticleContextValue = useMemo(
    () =>
      newReferences.length === 0
        ? context
        : {
            ...context,
            references: [
              ...context.references,
              ...newReferences.map((r) => ({ ...r, apiMap: r.text.match(/((?:Physlib|PhyslibAlpha|QuantumInfo)\/[^\s,;)]*?)\/API-map\.md/)?.[1] ?? null })),
            ],
          },
    [context, newReferences],
  );

  // On the create page the citations come from the text being written.
  const cites = useMemo(
    () => (shape === "file" ? parseFullApiMap(text) : editContext),
    [shape, text, editContext],
  );

  const changed = text.trim() !== initial.trim();

  const publish = async () => {
    if (shape !== "file" && !changed) {
      setProblem("Make a change to the text first.");
      return;
    }
    const uncited = newReferences.filter((r) => !text.includes(`{${r.index}}`));
    if (uncited.length > 0) {
      setProblem(`Cite the new reference {${uncited[0].index}} in the text, or remove it.`);
      return;
    }
    const invalid = validate?.(text) ?? null;
    if (invalid) {
      setProblem(invalid);
      return;
    }
    setProblem(null);
    const diff = shape === "file" ? "" : unifiedDiff(lineDiff(baseline ?? initial, text));
    const base =
      `https://github.com/${repo}/issues/new` +
      `?labels=${encodeURIComponent("API")}` +
      `&title=${encodeURIComponent(issue.title)}`;
    const body = (withDiff: boolean) => issue.body({ text, summary, diff, newReferences, withDiff });
    // The diff is only for people; the text a bot needs always stays.
    let url = `${base}&body=${encodeURIComponent(body(true))}`;
    if (url.length > MAX_URL_LENGTH) url = `${base}&body=${encodeURIComponent(body(false))}`;
    if (url.length > MAX_URL_LENGTH) {
      // Too long to prefill at all: open the blank form, and put the whole
      // body on the clipboard so nothing written is lost.
      window.open(base, "_blank", "noopener,noreferrer");
      try {
        await navigator.clipboard.writeText(body(true));
        setCopiedNotice(true);
      } catch {
        /* clipboard blocked - the form still opens, just empty */
      }
      return;
    }
    setCopiedNotice(false);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const tabs: { key: typeof view; label: string }[] = [
    { key: "write", label: "Write" },
    { key: "preview", label: "Preview" },
    ...(shape === "file" ? [] : [{ key: "changes" as const, label: "Changes" }]),
  ];

  return (
    <div>
      {heading}
      {notice}
      {before}

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-secondary/40 px-2 py-1.5">
          <div role="tablist" className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={view === t.key}
                onClick={() => setView(t.key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === t.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {view === "write" && (
            <CiteToolbar
              leanReferences={cites.leanReferences}
              references={cites.references}
              insert={(snippet) => area.current && insertAt(area.current, snippet, setText)}
              onNewReference={canAddReferences ? () => setAddingReference(true) : undefined}
            />
          )}
        </div>
        {view === "write" && addingReference && (
          <NewReferenceForm
            index={nextReferenceIndex}
            onCancel={() => setAddingReference(false)}
            onAdd={(refText) => {
              setNewReferences((refs) => [...refs, { index: nextReferenceIndex, text: refText }]);
              setAddingReference(false);
              if (area.current) insertAt(area.current, ` {${nextReferenceIndex}}`, setText);
            }}
          />
        )}
        {newReferences.length > 0 && (
          <ul className="flex flex-col gap-1 border-b border-border px-3 py-2 text-xs">
            {newReferences.map((r) => (
              <li key={r.index} className="flex items-baseline gap-2">
                <span className="rounded-full border border-success/30 bg-success/10 px-1.5 text-[10px] font-medium text-success">
                  new
                </span>
                <code className="apimap-code">{`{${r.index}}`}</code>
                <span className="min-w-0 flex-1 truncate text-muted" title={r.text}>
                  {r.text}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    // Later new references keep their numbers - a gap is
                    // easier to spot than citations that silently move.
                    setNewReferences((refs) => refs.filter((x) => x.index !== r.index));
                    setText((t) => t.split(`{${r.index}}`).join(""));
                  }}
                  className="text-muted hover:text-danger"
                  aria-label={`Remove reference {${r.index}}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {view === "write" && (
          <textarea
            ref={area}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={shape === "lead" ? 8 : shape === "section" || shape === "new" ? 14 : 24}
            spellCheck
            aria-label="Source text"
            className="block w-full resize-y border-0 bg-surface p-3 font-mono text-[13px] leading-relaxed text-foreground outline-none"
          />
        )}
        {view === "preview" && (
          <div className="p-4">
            <Preview
              text={text}
              shape={shape}
              context={editContext}
              showReferences={newReferences.length > 0}
            />
          </div>
        )}
        {view === "changes" && (
          <div className="p-4">
            <Changes before={baseline ?? initial} after={text} />
            {newReferences.length > 0 && (
              <div className="apimap-diff mt-3">
                {newReferences.map((r) => (
                  <div key={r.index} className="apimap-diff-line apimap-diff-add">
                    <span aria-hidden className="apimap-diff-op">+</span>
                    <span className="whitespace-pre-wrap break-words">
                      {r.index}. {r.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <label className="mt-4 block">
        <span className="text-xs font-medium">
          Why the change? <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What does this improve?"
          className="mt-1.5 w-full rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-sm outline-none placeholder:text-muted/50 focus:border-accent"
        />
      </label>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Submitting opens GitHub in a new tab with an issue on{" "}
        <code className="apimap-code">{repo}</code> filled in; you press{" "}
        <em>Create</em>. You must be signed in to a GitHub account. If the
        suggestion is accepted, you&apos;ll be credited as a co-author.
      </p>

      {problem && <p className="mt-2 text-sm text-danger">{problem}</p>}
      {copiedNotice && (
        <p className="mt-2 text-xs text-muted">
          Your suggestion was too long to prefill, so it has been copied to
          your clipboard. Paste it into the issue body.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={publish} className={githubButtonClasses(true)} style={githubButtonStyle}>
          <GitHubIcon />
          Create issue
        </button>
      </div>
      {footer && <div className="mt-3 text-right text-xs text-muted">{footer}</div>}
    </div>
  );
}
