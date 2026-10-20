"use client";

import { useMemo, useState } from "react";
import type { ApiMapLeanReference, ApiMapNode, ApiMapReference } from "@/lib/yaml";
import {
  alphaParts,
  backlinkLabel,
  citeKey,
  claimCounts,
  historyUrl,
  linkCitations,
  moduleOf,
  newSectionPositions,
  newSectionTarget,
  referenceId,
  talkUrl,
  treeUrl,
  type AlphaParts,
  type Article,
  type CitationOccurrences,
  type EditTarget,
} from "@/lib/api-map-article";
import { API_STATUS_DOT, apiStatusKind } from "@/lib/api-map-status";
import { TopRightArrowIcon } from "@/components/monthly-updates/icons";
import {
  ApiLink,
  DeclarationLink,
  ExternalLink,
  LeanFileLink,
  ReferenceText,
  ArticleProse,
  scrollToArticleId,
} from "@/components/api-tracker/article-prose";

/**
 * The read view of one API map: an article in the order the file is
 * written - abstract, sections, Lean declarations, references - with a
 * summary card beside the abstract, an "On this page" list, a suggest-edit
 * control on every section, and footnote-style reference lists that link
 * back to each citation.
 */

// ─── Small pieces ───────────────────────────────────────────────────────────

const pill =
  "flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent";

export function PencilIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

/** The actions along the top of an article. */
export function ArticleToolbar({
  node,
  repo,
  branch,
  onEdit,
}: {
  node: ApiMapNode;
  repo: string;
  branch: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={onEdit} className={pill}>
        <PencilIcon />
        Suggest an edit
      </button>
      <a href={node.url} target="_blank" rel="noopener noreferrer" className={pill}>
        View on GitHub
        <TopRightArrowIcon className="size-3" />
      </a>
      <a href={historyUrl(repo, branch, node.file)} target="_blank" rel="noopener noreferrer" className={pill}>
        History
        <TopRightArrowIcon className="size-3" />
      </a>
      <a href={talkUrl(repo, node.title)} target="_blank" rel="noopener noreferrer" className={pill}>
        Discussion
        <TopRightArrowIcon className="size-3" />
      </a>
    </div>
  );
}

/** `Physlib / SpaceAndTime / Time`, each folder linking to it on GitHub. */
export function Breadcrumb({ path, repo, branch }: { path: string; repo: string; branch: string }) {
  const segments = path.split("/");
  return (
    <nav aria-label="Location in Physlib" className="flex flex-wrap items-center gap-1 font-mono text-[11px] text-muted">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className="text-muted/50">/</span>}
          <a
            href={treeUrl(repo, branch, segments.slice(0, i + 1).join("/"))}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent"
          >
            {seg}
          </a>
        </span>
      ))}
    </nav>
  );
}

/** The small "Alpha" tag, on the header and on each Alpha part of a map
 *  whose other parts are reviewed. */
export function AlphaTag({ title }: { title?: string }) {
  return (
    <span
      className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium leading-none text-warning"
      title={title ?? "Not yet through Physlib's full review"}
    >
      Alpha
    </span>
  );
}

/** What is Alpha, in words: "the abstract", "part of the content", … */
function alphaPartsPhrase(parts: AlphaParts): string {
  return [
    parts.abstract ? "the abstract" : null,
    parts.content === "all" ? "the content" : parts.content === "some" ? "part of the content" : null,
  ]
    .filter(Boolean)
    .join(" and ");
}

export function StatusPills({ node }: { node: ApiMapNode }) {
  const { done, total } = claimCounts(node);
  const parts = alphaParts(node);
  const phrase = alphaPartsPhrase(parts);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {parts.any && (
        <AlphaTag title={parts.mixed ? `Alpha: ${phrase}` : "Not yet through Physlib's full review"} />
      )}
      <span className="text-xs text-muted">
        {total > 0 ? `${done} of ${total} claims formalized` : "No claims yet"}
      </span>
    </div>
  );
}

/** A highlighted note at the head of the article or the editor. */
export function Callout({
  tone = "accent",
  children,
}: {
  tone?: "accent" | "warning";
  children: React.ReactNode;
}) {
  const colors =
    tone === "warning" ? "border-warning/30 bg-warning/10" : "border-accent/25 bg-accent/5";
  return (
    <div className={`mb-5 rounded-lg border px-4 py-3 text-sm leading-relaxed text-foreground/85 ${colors}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  id,
  level,
  children,
  onEdit,
  alpha = false,
}: {
  id?: string;
  level: 2 | 3;
  children: React.ReactNode;
  onEdit?: () => void;
  /** Show the Alpha tag - only where the map mixes Alpha and reviewed parts. */
  alpha?: boolean;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <H id={id} className={`group ${level === 2 ? "apimap-h2" : "apimap-h3"}`}>
      <span>{children}</span>
      {alpha && <AlphaTag />}
      {onEdit && (
        <button type="button" onClick={onEdit} className="apimap-edit" aria-label={`Suggest an edit to ${children}`}>
          <PencilIcon />
          Edit
        </button>
      )}
    </H>
  );
}

// ─── Citations across the article ──────────────────────────────────────────

/** The article's markdown with citations linked, numbered in reading order
 *  so the reference lists can point back at every place they're cited. */
export function useLinkedArticle(article: Article, idPrefix: string) {
  return useMemo(() => {
    const occurrences: CitationOccurrences = new Map();
    const link = (md: string) => linkCitations(md, occurrences, idPrefix);
    return {
      lead: link(article.lead),
      intro: article.intro.map((i) => ({ ...i, body: link(i.body) })),
      sections: article.sections.map((s) => ({ ...s, body: link(s.body) })),
      occurrences,
    };
  }, [article, idPrefix]);
}

/** ↩ links back to each place a reference is cited, as in footnotes. */
function Backlinks({ ids }: { ids: string[] | undefined }) {
  if (!ids || ids.length === 0) return null;
  return (
    <span className="ml-1 inline-flex gap-0.5">
      {ids.map((id, i) => (
        <button
          key={id}
          type="button"
          className="apimap-backlink"
          onClick={() => scrollToArticleId(id)}
          aria-label={`Back to citation ${i + 1}`}
        >
          ↩{ids.length > 1 && <sup>{i + 1}</sup>}
        </button>
      ))}
    </span>
  );
}

export function LeanReferenceList({
  references,
  occurrences,
}: {
  references: ApiMapLeanReference[];
  occurrences: CitationOccurrences;
}) {
  return (
    <ol className="apimap-reflist">
      {references.map((ref) => (
        <li key={ref.index} id={referenceId("lean", ref.index)}>
          <span className="apimap-refnum">{ref.index}</span>
          <span className="min-w-0">
            <LeanFileLink reference={ref} />
            <Backlinks ids={occurrences.get(citeKey("lean", ref.index))} />
            {ref.declarations.length > 0 && (
              <span className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-0.5">
                {ref.declarations.map((d, i) => (
                  <DeclarationLink key={i} file={ref.file} decl={d} />
                ))}
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function LiteratureList({
  references,
  occurrences,
}: {
  references: ApiMapReference[];
  occurrences: CitationOccurrences;
}) {
  return (
    <ol className="apimap-reflist">
      {references.map((ref) => (
        <li key={ref.index} id={referenceId("lit", ref.index)}>
          <span className="apimap-refnum">{backlinkLabel(ref.index - 1)}</span>
          <span className="min-w-0">
            <ReferenceText reference={ref} />
            <Backlinks ids={occurrences.get(citeKey("lit", ref.index))} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Abstract, unheaded content and the sections - shared by the read view
 *  and the edit preview. */
export function ArticleBody({
  linked,
  leadAlpha = false,
  tagAlpha = false,
  onEditLead,
  onEditSection,
  afterLead,
}: {
  linked: ReturnType<typeof useLinkedArticle>;
  leadAlpha?: boolean;
  /** Mark each Alpha part - for a map whose other parts are reviewed. */
  tagAlpha?: boolean;
  onEditLead?: () => void;
  onEditSection?: (target: EditTarget, sectionId: string) => void;
  afterLead?: React.ReactNode;
}) {
  return (
    <>
      {linked.lead && (
        <div className="apimap-lead group">
          {(onEditLead || (tagAlpha && leadAlpha)) && (
            <div className="flex items-center gap-2">
              <span className="label-mono text-muted/80">Abstract</span>
              {tagAlpha && leadAlpha && <AlphaTag />}
              {onEditLead && (
                <button type="button" onClick={onEditLead} className="apimap-edit" aria-label="Suggest an edit to the abstract">
                  <PencilIcon />
                  Edit
                </button>
              )}
            </div>
          )}
          <ArticleProse markdown={linked.lead} />
        </div>
      )}
      {afterLead}
      {linked.intro.map((i, k) => (
        <div key={k}>
          {tagAlpha && i.alpha && (
            <p className="!mb-0 flex items-center gap-2 text-xs text-muted">
              <AlphaTag /> Content
            </p>
          )}
          <ArticleProse markdown={i.body} />
        </div>
      ))}
      {linked.sections.map((s) => (
        <section key={s.id}>
          <SectionHeading
            id={s.id}
            level={s.level}
            onEdit={onEditSection ? () => onEditSection(s.edit, s.id) : undefined}
            // A nested `Content (Alpha)` heading already says so.
            alpha={tagAlpha && s.alpha && !s.title.endsWith("(Alpha)")}
          >
            {s.title}
          </SectionHeading>
          <ArticleProse markdown={s.body} />
        </section>
      ))}
    </>
  );
}

// ─── Summary card and contents ──────────────────────────────────────────────

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border px-4 py-2.5 first:border-t-0">
      <dt className="label-mono mb-0.5 text-muted/80">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SummaryCard({
  node,
  dependents,
  repo,
  branch,
}: {
  node: ApiMapNode;
  dependents: ApiMapNode[];
  repo: string;
  branch: string;
}) {
  const kind = apiStatusKind(node);
  const { done, total } = claimCounts(node);
  const parts = alphaParts(node);
  const files = new Set(node.leanReferences.map((r) => r.file)).size;
  const decls = node.leanReferences.reduce((n, r) => n + r.declarations.length, 0);
  return (
    <aside className="apimap-summary" aria-label="Summary">
      <dl className="text-[13px] leading-snug">
        <SummaryRow label="Progress">
          {total > 0 ? (
            <>
              <span className="block">
                {done} of {total} claims formalized
              </span>
              <span className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full bg-border">
                <span
                  className={`block h-full rounded-full ${API_STATUS_DOT[kind]}`}
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </span>
              {total > done && (
                <span className="mt-1 block text-xs text-muted">{total - done} claims still to formalize</span>
              )}
            </>
          ) : (
            "No claims yet"
          )}
        </SummaryRow>
        <SummaryRow label="Review">
          {parts.mixed ? (
            <span className="flex flex-col">
              <span>Abstract: {parts.abstract ? "Alpha" : "reviewed"}</span>
              <span>
                Content:{" "}
                {parts.content === "all" ? "Alpha" : parts.content === "some" ? "partly Alpha" : "reviewed"}
              </span>
            </span>
          ) : parts.any ? (
            "Alpha"
          ) : (
            "Reviewed"
          )}
        </SummaryRow>
        <SummaryRow label="Module">
          <span className="break-all font-mono text-[11px]">{moduleOf(node.path)}</span>
        </SummaryRow>
        {files > 0 && (
          <SummaryRow label="Lean">
            {decls} declaration{decls === 1 ? "" : "s"} in {files} file{files === 1 ? "" : "s"}
          </SummaryRow>
        )}
        {node.parents.length > 0 && (
          <SummaryRow label="Builds on">
            <span className="flex flex-col gap-0.5">
              {node.parents.map((p) => (
                <ApiLink key={p.path} path={p.path} fallbackTitle={p.name} />
              ))}
            </span>
          </SummaryRow>
        )}
        {dependents.length > 0 && (
          <SummaryRow label="Used by">
            <span className="flex flex-col gap-0.5">
              {dependents.map((d) => (
                <ApiLink key={d.path} path={d.path} />
              ))}
            </span>
          </SummaryRow>
        )}
        <SummaryRow label="Source">
          <ExternalLink href={node.url}>API-map.md</ExternalLink>
          <span className="text-muted"> · </span>
          <ExternalLink href={treeUrl(repo, branch, node.path)}>folder</ExternalLink>
        </SummaryRow>
      </dl>
    </aside>
  );
}

type TocItem = { id: string; number: string; title: string; level: 2 | 3 };

function OnThisPage({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(true);
  if (items.length < 2) return null;
  return (
    <nav className="apimap-toc" aria-label="On this page">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 text-[10px] font-bold uppercase tracking-widest text-muted/70"
      >
        On this page
        <span aria-hidden className={`transition-transform ${open ? "" : "-rotate-90"}`}>
          ▾
        </span>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col">
          {items.map((item) => (
            <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToArticleId(item.id);
                }}
                className="flex gap-2 rounded px-1 py-0.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                <span className="w-5 shrink-0 tabular-nums text-muted/60">{item.number}</span>
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}

// ─── The read view ──────────────────────────────────────────────────────────

export function ArticleReadView({
  node,
  article,
  dependents,
  repo,
  branch,
  generatedAt,
  onEdit,
  onAddReference,
}: {
  node: ApiMapNode;
  article: Article;
  dependents: ApiMapNode[];
  repo: string;
  branch: string;
  generatedAt: string;
  onEdit: (target: EditTarget, sectionId?: string) => void;
  /** References are added by citing them, so this opens the editor on the
   *  whole article with the new-reference form showing. */
  onAddReference: () => void;
}) {
  const linked = useLinkedArticle(article, "cite");

  const toc: TocItem[] = article.sections.map(({ id, number, title, level }) => ({
    id,
    number,
    title,
    level,
  }));
  const extra: { id: string; title: string; show: boolean }[] = [
    { id: "apimap-see-also", title: "See also", show: node.parents.length > 0 },
    { id: "apimap-lean-declarations", title: "Lean declarations", show: node.leanReferences.length > 0 },
    { id: "apimap-references", title: "References", show: true },
  ];
  let n = article.sections.filter((s) => s.level === 2).length;
  for (const e of extra) if (e.show) toc.push({ id: e.id, number: String(++n), title: e.title, level: 2 });

  const parts = alphaParts(node);
  const phrase = alphaPartsPhrase(parts);
  const date = generatedAt
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(generatedAt))
    : null;

  return (
    <>
      {parts.any && (
        <Callout tone="warning">
          <span className="font-medium text-foreground">Alpha.</span>{" "}
          {parts.mixed ? (
            `In this API map ${phrase} ${phrase.includes(" and ") ? "are" : "is"} Alpha ` +
            "(marked below) and the rest is reviewed. The Alpha parts have not yet been " +
            "through Physlib's full review, so they may be incomplete and are likely to change."
          ) : (
            <>
              This API map has not yet been through Physlib&apos;s full review, so
              it may be incomplete and is likely to change.
            </>
          )}
        </Callout>
      )}

      <div className="apimap-body">
        <SummaryCard node={node} dependents={dependents} repo={repo} branch={branch} />
        <ArticleBody
          linked={linked}
          leadAlpha={article.leadAlpha}
          tagAlpha={parts.mixed}
          onEditLead={() => onEdit(article.leadEdit)}
          onEditSection={(t, id) => onEdit(t, id)}
          afterLead={<OnThisPage items={toc} />}
        />

        <button
          type="button"
          onClick={() => {
            const positions = newSectionPositions(node);
            onEdit(newSectionTarget(node, positions[positions.length - 1] ?? null));
          }}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          <span aria-hidden>＋</span>
          Add a section
        </button>

        {node.parents.length > 0 && (
          <section>
            <SectionHeading id="apimap-see-also" level={2}>
              See also
            </SectionHeading>
            <ul className="flex flex-wrap gap-1.5">
              {node.parents.map((p) => (
                <li key={p.path} className="rounded-lg border border-border px-2.5 py-1 text-sm">
                  <ApiLink path={p.path} fallbackTitle={p.name} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {node.leanReferences.length > 0 && (
          <section>
            <SectionHeading id="apimap-lean-declarations" level={2}>
              Lean declarations
            </SectionHeading>
            <p className="apimap-hint">
              The numbered citations in the text point here. Hover over a
              declaration for its signature and docstring; click it for the
              documentation.
            </p>
            <LeanReferenceList references={node.leanReferences} occurrences={linked.occurrences} />
          </section>
        )}

        <section>
          <SectionHeading id="apimap-references" level={2}>
            References
          </SectionHeading>
          {node.references.length > 0 ? (
            <LiteratureList references={node.references} occurrences={linked.occurrences} />
          ) : (
            <p className="apimap-hint">No references yet.</p>
          )}
          <button
            type="button"
            onClick={onAddReference}
            className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <span aria-hidden>＋</span>
            Add a reference
          </button>
        </section>

        <p className="mt-10 border-t border-border pt-3 text-xs text-muted">
          Rendered from <ExternalLink href={node.url}>{node.file}</ExternalLink>
          {date && <> on {date}</>}.
        </p>
      </div>
    </>
  );
}

/** What a link to a cited-but-unwritten API map leads to. */
export function MissingApiMapView({
  path,
  title,
  citedBy,
}: {
  path: string;
  title: string;
  citedBy: ApiMapNode[];
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-secondary/40 p-6">
      <p className="text-sm leading-relaxed text-muted">
        There is no API map for <span className="text-foreground">{title}</span> yet. It
        would live at <code className="apimap-code">{path}/API-map.md</code>
        {citedBy.length > 0 && <>, and is already cited by other maps</>}.
      </p>
      {citedBy.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {citedBy.map((n) => (
            <span key={n.path} className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs">
              <ApiLink path={n.path} />
            </span>
          ))}
        </div>
      )}
      <a
        href={`/api-tracker/new?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}`}
        className={`${pill} mt-4 inline-flex w-fit`}
      >
        <span aria-hidden>＋</span>
        Start this API map
      </a>
    </div>
  );
}
