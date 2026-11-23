"use client";

import { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { site } from "@/lib/site";
import type { TodoData, TodoItem } from "@/lib/yaml";
import { todoSubfield } from "./todo-subfield";

export const itemTypes = {
  informalDef: {
    label: "Informal Definition",
    className: "bg-(--accent-tint) text-accent border-accent/20",
    tagPrefix: "informal_def",
  },
  informalLemma: {
    label: "Informal Lemma",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
    tagPrefix: "informal_lemma",
  },
  semiformal: {
    label: "Semiformal Result",
    className: "bg-(--accent-tint) text-accent border-accent/20",
    tagPrefix: "semiformal_result",
  },
  sorryful: {
    label: "Sorryful Result",
    className: "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
    tagPrefix: "sorryful result",
  },
  todo: {
    label: "TODO Item",
    className: "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400",
    tagPrefix: "TODO",
  },
  githubIssue: {
    label: "GitHub Issue",
    className: "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
  },
};

export type ItemType = keyof typeof itemTypes;
type FilterType = "all" | ItemType;
const filterOptions: FilterType[] = ["all", ...(Object.keys(itemTypes) as ItemType[])];

export function getItemType(item: TodoItem): ItemType {
  if (item.isGitHubIssue) return "githubIssue";
  if (item.isInformalDef) return "informalDef";
  if (item.isInformalLemma) return "informalLemma";
  if (item.isSemiFormalResult) return "semiformal";
  if (item.isSorryfulResult) return "sorryful";
  return "todo";
}

function copyTagText(item: TodoItem, type: ItemType, tagHref: string): string {
  if (type === "githubIssue") return `[GitHub Issue: ${item.name}](${item.githubLink})`;
  const name = type === "todo" ? `file ${item.name}` : item.name;
  return `[${itemTypes[type].tagPrefix} (${item.tag}): ${name}](${new URL(tagHref, site.url + "/todo")})`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-0.5 rounded-(--radius) text-xs border border-border bg-surface hover:bg-surface-secondary transition-colors"
    >
      {copied ? "Copied!" : "Copy Tag"}
    </button>
  );
}

export function TodoItemCard({
  item,
  tagHref = `#${item.tag}`,
  linkedIssue,
  compactLabels = false,
}: {
  item: TodoItem;
  tagHref?: string;
  linkedIssue?: { href: string; label: string; assignees?: string[] };
  compactLabels?: boolean;
}) {
  const type = getItemType(item);
  const { line, endLine } = item;
  let githubLabel = "See on GitHub";
  if (!item.isGitHubIssue && Number.isSafeInteger(line) && line > 0) {
    githubLabel = endLine !== undefined && Number.isSafeInteger(endLine) && endLine > line
      ? `Lines ${line}–${endLine} on GitHub`
      : `Line ${line} on GitHub`;
  }
  return (
    <div
      id={item.tag}
      className="relative rounded-lg border border-border bg-surface px-4 py-3 flex flex-col gap-1.5 scroll-mt-20 wrap-anywhere"
    >
      {item.legacyTag && (
        <span id={item.legacyTag} aria-hidden="true" className="absolute top-0 scroll-mt-20" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {(!compactLabels || type !== "todo") && (
          <span
            className={`px-2 py-0.5 rounded-(--radius) text-xs font-medium border ${itemTypes[type].className}`}
          >
            {compactLabels && type === "sorryful" ? "Unfinished proof" : itemTypes[type].label}
          </span>
        )}
        <span className="text-sm font-medium">{item.name}</span>
      </div>
      {item.content && (
        item.isGitHubIssue ? (
          <div className="text-sm text-foreground/80 leading-relaxed prose-sm prose-physlib max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.content.trim()}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {item.content.trim()}
          </p>
        )
      )}
      <div className="flex flex-wrap gap-2 mt-1">
        <a
          href={item.githubLink}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={linkedIssue ? `Lean source: ${githubLabel}` : undefined}
          className="px-2 py-0.5 rounded-(--radius) text-xs border border-border bg-surface hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
        >
          {githubLabel} ↗
        </a>
        {linkedIssue && (
          <a
            href={linkedIssue.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-(--radius) border border-border bg-surface px-2 py-0.5 text-xs text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            {linkedIssue.label} ↗
          </a>
        )}
        <a
          href={tagHref}
          className="px-2 py-0.5 rounded-(--radius) text-xs border border-border bg-surface hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
        >
          Tag: {item.tag}
        </a>
        <CopyButton text={copyTagText(item, type, tagHref)} />
        {linkedIssue?.assignees && (
          <span className="px-1 py-0.5 text-xs text-foreground/70">
            {linkedIssue.assignees.length ? "Assigned to " + linkedIssue.assignees.join(", ") : "Unassigned"}
          </span>
        )}
      </div>
    </div>
  );
}

export function TodoClient({ data }: { data: TodoData }) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [subfield, setSubfield] = useState("");
  const [query, setQuery] = useState("");
  const subfields = useMemo(() => {
    const byName = new Map<string, TodoItem[]>();
    for (const item of data.TODOItem) {
      const name = todoSubfield(item);
      const group = byName.get(name);
      if (group) group.push(item);
      else byName.set(name, [item]);
    }
    return Array.from(byName, ([name, items]) => ({ name, items }))
      .sort((a, b) => a.name.localeCompare(b.name, "en"));
  }, [data.TODOItem]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(subfields.map(({ name }) => name)),
  );

  const words = query.toLowerCase().match(/\S+/g) ?? [];
  const searching = words.length > 0;
  const visibleSubfields = subfields
    .filter(({ name }) => !subfield || name === subfield)
    .map(({ name, items }) => ({
      name,
      items: items.filter((item) => {
        if (activeFilter !== "all" && getItemType(item) !== activeFilter) return false;
        if (!searching) return true;
        const text = [item.name, item.file, item.content, item.tag, item.category, name]
          .join(" ").toLowerCase();
        return words.every((word) => text.includes(word));
      }),
    }))
    .filter(({ items }) => items.length > 0);
  const resultCount = visibleSubfields.reduce((count, group) => count + group.items.length, 0);

  function toggleCategory(name: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search names, files, descriptions, or tags…"
              className="site-field"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Subfield
            <select
              value={subfield}
              onChange={(event) => {
                const name = event.target.value;
                setSubfield(name);
                if (name) setOpenCategories((previous) => new Set(previous).add(name));
              }}
              className="site-field"
            >
              <option value="">All subfields</option>
              {subfields.map(({ name }) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        <div role="group" aria-label="Item type" className="flex flex-wrap gap-2">
          {filterOptions.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={activeFilter === key}
              onClick={() => setActiveFilter(key)}
              className={`rounded-(--radius) border px-3 py-1 text-sm font-medium hover:border-current aria-pressed:ring-2 aria-pressed:ring-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${
                key === "all" ? "border-border bg-surface text-foreground" : itemTypes[key].className
              }`}
            >
              {key === "all" ? "All" : `${itemTypes[key].label}s`}
            </button>
          ))}
        </div>
      </div>

      <p role="status" className={resultCount ? "sr-only" : "text-sm text-muted"}>
        {resultCount === 0
          ? "No items match the current filters."
          : `${resultCount} matching ${resultCount === 1 ? "item" : "items"}`}
      </p>
      <div className="flex flex-col gap-6">
        {visibleSubfields.map(({ name, items }) => {
          const isOpen = searching || openCategories.has(name);

          return (
            <section key={name}>
              <h2 className="mb-3 text-lg font-semibold">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  disabled={searching}
                  onClick={() => toggleCategory(name)}
                  className="flex w-full items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {name}
                  <span className="text-xs font-normal text-muted border border-border rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                  {!searching && (
                    <span aria-hidden="true" className="ml-auto text-muted text-sm">
                      {isOpen ? "▲" : "▼"}
                    </span>
                  )}
                </button>
              </h2>

              {isOpen && (
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <TodoItemCard key={item.tag} item={item} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
