"use client";

import { createContext, useContext, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ApiMapDeclaration, ApiMapLeanReference, ApiMapNode, ApiMapReference } from "@/lib/yaml";
import {
  apiMapHref,
  backlinkLabel,
  claimCounts,
  docsUrl,
  findLeanReference,
  findReference,
  parseCiteHref,
  referenceId,
  sourceUrl,
} from "@/lib/api-map-article";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { API_STATUS_DOT, apiStatusKind } from "@/lib/api-map-status";

/**
 * The pieces an API-map article is written in: prose whose citations render
 * as superscripts that preview their reference on hover, links to Lean
 * declarations, links to other API maps (previewing the map on hover, or
 * marked as not written yet), and the reference lists' entries.
 */

export type ArticleContextValue = {
  repo: string;
  branch: string;
  leanReferences: ApiMapLeanReference[];
  references: ApiMapReference[];
  byPath: Map<string, ApiMapNode>;
};

export const ArticleContext = createContext<ArticleContextValue | null>(null);

function useArticle(): ArticleContextValue {
  const ctx = useContext(ArticleContext);
  if (!ctx) throw new Error("ArticleContext missing");
  return ctx;
}

/**
 * Scrolls to an element of the article and briefly highlights it, so the
 * reader sees which reference a superscript pointed at. Never through the URL
 * hash: on this page the hash names the selected API, and an in-page anchor
 * there would select nothing.
 */
export function scrollToArticleId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.remove("apimap-flash");
  // Restart the animation even when the same target is hit twice.
  void el.offsetWidth;
  el.classList.add("apimap-flash");
}

// ─── Hover cards ────────────────────────────────────────────────────────────

/**
 * A preview that opens on hover or keyboard focus. Built from spans only, so
 * it can sit inside a paragraph. It opens below its trigger and flips to
 * right-aligned when it would run off the viewport.
 */
export function HoverCard({
  trigger,
  children,
  width = 352,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect) setAlignRight(rect.left + width > window.innerWidth - 16);
      setOpen(true);
    }, 180);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <span
      ref={ref}
      className="relative inline"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      {open && (
        <span
          role="tooltip"
          className={`absolute top-full z-40 mt-1.5 block max-h-80 overflow-y-auto rounded-md border border-border bg-surface p-3 text-left text-[13px] font-normal leading-snug text-foreground shadow-xl ${
            alignRight ? "right-0" : "left-0"
          }`}
          style={{ width: `min(${width}px, calc(100vw - 2rem))` }}
        >
          {children}
        </span>
      )}
    </span>
  );
}

// ─── Links ──────────────────────────────────────────────────────────────────

export function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="apimap-external">
      {children}
    </a>
  );
}

/** A link to another API map. When no map exists at that path yet it is
 *  drawn dashed, like the flowchart's boxes for such maps, and leads to the
 *  create page instead. */
export function ApiLink({
  path,
  children,
  fallbackTitle,
}: {
  path: string;
  children?: React.ReactNode;
  fallbackTitle?: string;
}) {
  const { byPath } = useArticle();
  const target = byPath.get(path);
  if (!target) {
    const title = fallbackTitle ?? path.split("/").pop() ?? path;
    return (
      <Link
        href={`/api-tracker/new?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}`}
        className="apimap-missing"
        title={`${title} - no API map yet. Click to start one.`}
      >
        {children ?? title}
      </Link>
    );
  }
  const kind = apiStatusKind(target);
  const { done, total } = claimCounts(target);
  const excerpt = target.abstract.replace(/\s+/g, " ");
  return (
    <HoverCard
      trigger={
        <a
          href={apiMapHref(path)}
          onClick={(e) => {
            if (window.location.pathname !== "/api-tracker") return;
            e.preventDefault();
            selectApiMapEntry(path);
            window.scrollTo({ top: 0 });
          }}
          className="apimap-link"
        >
          {children ?? target.title}
        </a>
      }
    >
      <span className="block text-sm font-semibold">{target.title}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
        <span className={`size-1.5 rounded-full ${API_STATUS_DOT[kind]}`} />
        {total > 0 ? `${done} of ${total} claims formalized` : "No claims yet"}
      </span>
      <span className="mt-2 block text-foreground/85">
        {excerpt.length > 320 ? excerpt.slice(0, 317) + "…" : excerpt}
      </span>
    </HoverCard>
  );
}

const KIND_LABEL: Record<string, string> = {
  notation: "notation",
  instance: "instance",
};

/** A declaration named in a Lean reference: links to its doc-gen4 entry,
 *  previewing its signature and docstring on hover. */
export function DeclarationLink({ file, decl }: { file: string; decl: ApiMapDeclaration }) {
  const { repo, branch } = useArticle();
  const resolved = !!decl.fullName;
  return (
    <HoverCard
      width={420}
      trigger={
        <a href={docsUrl(file, decl.fullName)} className="apimap-decl">
          {decl.text}
        </a>
      }
    >
      <span className="mb-1 flex items-baseline justify-between gap-3">
        <span className="break-all font-mono text-[12px] font-semibold">
          {decl.fullName ?? decl.text}
        </span>
        <span className="shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
          {decl.kind ? (KIND_LABEL[decl.kind] ?? decl.kind) : "declaration"}
        </span>
      </span>
      {decl.signature && (
        <span className="mt-1 block whitespace-pre-wrap break-words rounded bg-surface-secondary px-2 py-1.5 font-mono text-[11px] leading-relaxed">
          {decl.signature}
        </span>
      )}
      {decl.doc && <span className="mt-2 block text-foreground/85">{decl.doc}</span>}
      {!resolved && (
        <span className="mt-1 block text-muted">
          {decl.kind === "notation" || decl.kind === "instance"
            ? `A ${decl.kind} provided by ${file}.`
            : `Declared in ${file}.`}
        </span>
      )}
      <span className="mt-2 flex gap-3 text-[12px]">
        <a href={docsUrl(file, decl.fullName)} className="apimap-link">
          Documentation
        </a>
        <ExternalLink href={sourceUrl(repo, branch, file, decl.line)}>Source</ExternalLink>
      </span>
    </HoverCard>
  );
}

/** A Lean file in a reference: its source on GitHub, marked when the file
 *  the map names doesn't exist. */
export function LeanFileLink({ reference }: { reference: ApiMapLeanReference }) {
  const { repo, branch } = useArticle();
  if (!reference.exists) {
    return (
      <span className="apimap-missing font-mono text-[0.85em]" title="This file does not exist in Physlib">
        {reference.file}
      </span>
    );
  }
  return (
    <a
      href={sourceUrl(repo, branch, reference.file)}
      target="_blank"
      rel="noopener noreferrer"
      className="apimap-external apimap-file"
    >
      {reference.file}
    </a>
  );
}

// ─── References ─────────────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s<>]+[^\s<>.,;:)]/g;

/** One literature reference: italics from its markdown, bare URLs linked,
 *  and a reference to another API map turned into a link to it. */
export function ReferenceText({ reference }: { reference: ApiMapReference }) {
  if (reference.apiMap) {
    const name = reference.text.split("—")[0].replace(/\s*API map\s*$/i, "").trim();
    return (
      <>
        <ApiLink path={reference.apiMap} fallbackTitle={name}>
          {name}
        </ApiLink>{" "}
        <span className="text-muted">(API map)</span>
      </>
    );
  }
  const markdown = reference.text.replace(URL_RE, (url) => `<${url}>`);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <>{children}</>,
        a: ({ href, children }) => <ExternalLink href={href ?? "#"}>{children}</ExternalLink>,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}

// ─── Citations ──────────────────────────────────────────────────────────────

function Citation({ href }: { href: string }) {
  const { leanReferences, references } = useArticle();
  const cite = parseCiteHref(href);
  if (!cite) return null;

  if (cite.kind === "todo") {
    return (
      <HoverCard
        width={300}
        trigger={
          <button type="button" className="apimap-todo">
            TODO
          </button>
        }
      >
        <span className="block font-semibold">Not yet formalized</span>
        <span className="mt-1 block text-foreground/85">
          This claim is part of the API&apos;s roadmap: it is stated here but
          not yet proved or defined in Lean. Contributions are welcome.
        </span>
        <span className="mt-2 block text-[12px]">
          <Link href="/get-involved" className="apimap-link">
            How to contribute
          </Link>
        </span>
      </HoverCard>
    );
  }

  const target = referenceId(cite.kind, cite.n);
  const label = cite.kind === "lean" ? String(cite.n) : backlinkLabel(cite.n - 1);
  const lean = cite.kind === "lean" ? findLeanReference(leanReferences, cite.n) : undefined;
  const lit = cite.kind === "lit" ? findReference(references, cite.n) : undefined;

  return (
    <HoverCard
      width={cite.kind === "lean" ? 420 : 352}
      trigger={
        <sup id={cite.id} className={`apimap-cite ${lean || lit ? "" : "apimap-cite-broken"}`}>
          <a
            href={`#${target}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToArticleId(target);
            }}
          >
            [{label}]
          </a>
        </sup>
      }
    >
      {lean ? (
        <>
          <span className="block">
            <span className="mr-1 text-muted">{cite.n}.</span>
            <LeanFileLink reference={lean} />
          </span>
          <span className="mt-1.5 flex flex-col gap-1.5">
            {lean.declarations.map((d, i) => (
              <span key={i} className="block">
                <a href={docsUrl(lean.file, d.fullName)} className="apimap-decl">
                  {d.text}
                </a>
                {d.doc && <span className="block text-[12px] text-muted line-clamp-2">{d.doc}</span>}
              </span>
            ))}
          </span>
        </>
      ) : lit ? (
        <span className="block">
          <span className="mr-1 text-muted">{label}.</span>
          <ReferenceText reference={lit} />
        </span>
      ) : (
        <span className="block text-muted">
          This citation does not match any entry in the{" "}
          {cite.kind === "lean" ? "Lean references" : "references"}.
        </span>
      )}
    </HoverCard>
  );
}

/** Article prose: markdown already passed through `linkCitations`. */
export function ArticleProse({ markdown }: { markdown: string }) {
  return (
    <div className="apimap-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith("#cite-")) return <Citation href={href} />;
            if (href?.startsWith("/") || href?.startsWith("#"))
              return (
                <a href={href} className="apimap-link">
                  {children}
                </a>
              );
            return <ExternalLink href={href ?? "#"}>{children}</ExternalLink>;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
