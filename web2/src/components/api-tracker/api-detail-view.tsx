"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiMap, ApiMapNode } from "@/lib/yaml";
import {
  buildArticle,
  claimCounts,
  editFileUrl,
  NEW_SECTION_TEMPLATE,
  NEW_SECTION_TITLE,
  newSectionPositions,
  newSectionTarget,
  wholeArticleTarget,
  type EditTarget,
} from "@/lib/api-map-article";
import { buildFolderTree, flattenFolderTree } from "@/lib/api-map-folders";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { ArticleContext, type ArticleContextValue, scrollToArticleId } from "@/components/api-tracker/article-prose";
import {
  ArticleReadView,
  ArticleToolbar,
  Breadcrumb,
  Callout,
  MissingApiMapView,
  StatusPills,
} from "@/components/api-tracker/article-view";
import { ArticleEditor } from "@/components/api-tracker/article-editor";
import { apiMapIssue, type IssueDraft } from "@/lib/api-map-issue";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
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
        d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"}
      />
    </svg>
  );
}

/** The issue a suggested change to one map files (see api-map-issue.ts). */
function editIssue(node: ApiMapNode, target: EditTarget, commit: string): IssueDraft {
  const { done, total } = claimCounts(node);
  const isNew = target.shape === "new";
  return apiMapIssue({
    title: isNew
      ? `API-map: new section for ${node.title}`
      : target.shape === "article"
        ? `API-map: edit to ${node.title}`
        : `API-map: edit to ${node.title} (${target.label})`,
    heading: isNew ? "Suggested new section" : "Suggested edit",
    facts: [
      `**API map:** [${node.title}](${node.url}) (\`${node.file}\`)`,
      isNew ? `**Adds:** ${target.location}` : `**Replaces:** ${target.location}`,
      `**Currently:** ${done} of ${total} claims formalized.`,
    ],
    file: node.file,
    commit,
    operation: target.operation,
    base: isNew ? null : target.source,
  });
}

/** The skeleton must have been turned into a real section. */
function validateNewSection(text: string): string | null {
  const heading = text.split("\n").find((l) => /^### /.test(l));
  if (!heading) return "Start the section with a ### title.";
  if (heading.slice(4).trim() === NEW_SECTION_TITLE) return "Give the section a title.";
  if (text.trim() === NEW_SECTION_TEMPLATE.trim()) return "Write the section first.";
  return null;
}

/** Where a new section goes: at the start of the Alpha content, or after one
 *  of its sections. A map without Alpha content gets a new such section, so
 *  there is nothing to choose. */
function NewSectionPosition({
  node,
  location,
  onChange,
}: {
  node: ApiMapNode;
  location: string;
  onChange: (after: string | null) => void;
}) {
  const positions = newSectionPositions(node);
  const current = positions.find((p) => location.endsWith(`after \`### ${p}\``)) ?? "";
  return (
    <label className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs font-medium">Place it</span>
      {positions.length > 0 ? (
        <select
          value={current}
          onChange={(e) => onChange(e.target.value || null)}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="">At the start of the content</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              After “{p}”
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs text-muted">in a new Alpha content section, after the existing content</span>
      )}
    </label>
  );
}

export function ApiDetailView({ apiMap }: { apiMap: ApiMap }) {
  const { nodes, repo, branch, commit, generatedAt } = apiMap;

  // Menu order: Physlib's folders, as in the sidebar.
  const entries = useMemo(() => flattenFolderTree(buildFolderTree(nodes)), [nodes]);
  const byPath = useMemo(() => new Map(nodes.map((n) => [n.path, n])), [nodes]);

  /** Who cites this map - the "Used by" of the infobox and "What links
   *  here" of a map that doesn't exist yet. */
  const dependentsOf = useMemo(() => {
    const map = new Map<string, ApiMapNode[]>();
    for (const node of nodes) {
      for (const parent of node.parents) {
        const list = map.get(parent.path) ?? [];
        list.push(node);
        map.set(parent.path, list);
      }
    }
    return map;
  }, [nodes]);

  const [activePath, setActivePath] = useState("");
  useEffect(() => {
    const onHashChange = () =>
      setActivePath(decodeURIComponent(window.location.hash.replace(/^#/, "")));
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const found = entries.findIndex((e) => e.path === activePath);
  // A map other maps cite but nobody has written yet (a dashed box in the
  // flowchart) - shown as such, outside the menu order.
  const citedName = useMemo(() => {
    for (const n of nodes) {
      const p = n.parents.find((q) => q.path === activePath);
      if (p) return p.name;
    }
    return null;
  }, [nodes, activePath]);
  const missing = found < 0 && citedName !== null;
  // Nothing selected yet (or a hash naming something that isn't in the map):
  // fall back to the first entry so the page is never blank.
  const index = found >= 0 ? found : 0;
  const current: { path: string; title: string; node: ApiMapNode | null } | undefined = missing
    ? { path: activePath, title: citedName, node: null }
    : entries[index] && { path: entries[index].path, title: entries[index].title, node: entries[index] };
  const node = current?.node ?? null;

  // The edit view is per API: moving to another one returns to reading.
  const [editing, setEditing] = useState<{
    path: string;
    target: EditTarget;
    sectionId?: string;
    addReference?: boolean;
  } | null>(null);
  const edit = editing && editing.path === current?.path ? editing : null;

  const startEdit = useCallback(
    (target: EditTarget, sectionId?: string, addReference = false) => {
      if (!current) return;
      setEditing({ path: current.path, target, sectionId, addReference });
      window.scrollTo({ top: 0 });
    },
    [current],
  );
  const stopEdit = useCallback(() => {
    const sectionId = edit?.sectionId;
    setEditing(null);
    // Back to the section the reader chose to edit.
    if (sectionId) requestAnimationFrame(() => scrollToArticleId(sectionId));
  }, [edit]);

  const go = useCallback(
    (delta: number) => {
      const next = entries[index + delta];
      if (next) selectApiMapEntry(next.path);
    },
    [entries, index],
  );

  useEffect(() => {
    // Never page away from a half-written edit.
    if (edit) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (document.querySelector("dialog[open]")) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, edit]);

  const article = useMemo(
    () => (node ? buildArticle(node.abstractHeading, node.abstract, node.content) : null),
    [node],
  );

  const context: ArticleContextValue = useMemo(
    () => ({
      repo,
      branch,
      leanReferences: node?.leanReferences ?? [],
      references: node?.references ?? [],
      byPath,
    }),
    [repo, branch, node, byPath],
  );

  if (!current) return null;

  const navButton =
    "flex size-7 items-center justify-center rounded-lg border border-border text-muted transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30";

  return (
    <ArticleContext.Provider value={context}>
      <div className="apimap">
        <header className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <Breadcrumb path={current.path} repo={repo} branch={branch} />
            {!edit && !missing && (
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous API map" className={navButton}>
                  <ChevronIcon direction="left" />
                </button>
                <span className="tabular-nums">
                  {index + 1} of {entries.length}
                </span>
                <button
                  type="button"
                  onClick={() => go(1)}
                  disabled={index === entries.length - 1}
                  aria-label="Next API map"
                  className={navButton}
                >
                  <ChevronIcon direction="right" />
                </button>
              </div>
            )}
          </div>
          {edit ? (
            <>
              <button type="button" onClick={stopEdit} className="mb-2 text-xs text-muted hover:text-accent">
                ← Back to {current.title}
              </button>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                {edit.target.shape === "new" ? "Add a section" : "Suggest an edit"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {current.title}
                {edit.target.shape !== "article" && edit.target.shape !== "new" && <> · {edit.target.label}</>}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{current.title}</h1>
              {node && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <StatusPills node={node} />
                  <ArticleToolbar node={node} repo={repo} branch={branch} onEdit={() => startEdit(wholeArticleTarget(node))} />
                </div>
              )}
            </>
          )}
        </header>

        {edit && node ? (
          <ArticleEditor
            // Stable while the new section's position changes, so the text
            // being written survives it.
            key={`${node.path}:${edit.target.shape === "new" ? "new" : edit.target.location}`}
            notice={
              <Callout>
                {edit.target.shape === "new" ? (
                  <>
                    You are proposing a new section for this API map. Give it a{" "}
                    <code className="apimap-code">###</code> title and write it as
                    the other sections are; it is added to the Alpha content,
                    since it has not been reviewed yet.
                  </>
                ) : (
                  <>
                    You are suggesting a change to{" "}
                    <span className="font-medium text-foreground">
                      {edit.target.shape === "article" ? edit.target.label : `“${edit.target.label}”`}
                    </span>
                    .
                  </>
                )}{" "}
                API maps are files in the Physlib repository, so the suggestion is
                filed as a GitHub issue for a maintainer to review. Cite Lean
                declarations with <code className="apimap-code">[n]</code>,
                literature with <code className="apimap-code">{"{n}"}</code>,
                and mark claims not yet formalized with{" "}
                <code className="apimap-code">[TODO]</code>; the abstract has
                no citations.
              </Callout>
            }
            initial={edit.target.source}
            baseline={edit.target.shape === "new" ? "" : undefined}
            startAddingReference={edit.addReference}
            shape={edit.target.shape}
            validate={edit.target.shape === "new" ? validateNewSection : undefined}
            before={
              edit.target.shape === "new" ? (
                <NewSectionPosition
                  node={node}
                  location={edit.target.location}
                  onChange={(after) => setEditing({ ...edit, target: newSectionTarget(node, after) })}
                />
              ) : undefined
            }
            context={context}
            repo={repo}
            issue={editIssue(node, edit.target, commit)}
            onCancel={stopEdit}
            footer={
              <>
                Comfortable with Git?{" "}
                <a
                  href={editFileUrl(repo, branch, node.file)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apimap-external"
                >
                  Edit API-map.md on GitHub
                </a>{" "}
                to open a pull request directly.
              </>
            }
          />
        ) : node && article ? (
          <ArticleReadView
            node={node}
            article={article}
            dependents={dependentsOf.get(node.path) ?? []}
            repo={repo}
            branch={branch}
            generatedAt={generatedAt}
            onEdit={startEdit}
            onAddReference={() => startEdit(wholeArticleTarget(node), undefined, true)}
          />
        ) : (
          <MissingApiMapView
            path={current.path}
            title={current.title}
            citedBy={dependentsOf.get(current.path) ?? []}
          />
        )}
      </div>
    </ArticleContext.Provider>
  );
}
