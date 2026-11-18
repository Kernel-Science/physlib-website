"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { TodoData, TodoItem } from "@/lib/yaml";

type FilterType =
  | "all"
  | "informalDef"
  | "informalLemma"
  | "semiformal"
  | "sorryful"
  | "todo";

const filterOptions: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "informalDef", label: "Informal Definitions" },
  { key: "informalLemma", label: "Informal Lemmas" },
  { key: "semiformal", label: "Semiformal Results" },
  { key: "sorryful", label: "Sorryful Results" },
  { key: "todo", label: "TODO Items" },
];

function matchesFilter(item: TodoItem, filter: FilterType): boolean {
  if (filter === "all") return true;
  if (filter === "informalDef") return item.isInformalDef;
  if (filter === "informalLemma") return item.isInformalLemma;
  if (filter === "semiformal") return item.isSemiFormalResult;
  if (filter === "sorryful") return item.isSorryfulResult;
  if (filter === "todo")
    return (
      !item.isInformalDef &&
      !item.isInformalLemma &&
      !item.isSemiFormalResult &&
      !item.isSorryfulResult
    );
  return true;
}

function itemTypeLabel(
  item: TodoItem,
): { label: string; className: string; tagText: string } {
  if (item.isInformalDef)
    return {
      label: "Informal Definition",
      className:
        "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
      tagText: `[informal_def (${item.tag}): ${item.name}](https://physlib.io/todo#${item.tag})`,
    };
  if (item.isInformalLemma)
    return {
      label: "Informal Lemma",
      className:
        "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
      tagText: `[informal_lemma (${item.tag}): ${item.name}](https://physlib.io/todo#${item.tag})`,
    };
  if (item.isSemiFormalResult)
    return {
      label: "Semiformal Result",
      className:
        "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
      tagText: `[semiformal_result (${item.tag}): ${item.name}](https://physlib.io/todo#${item.tag})`,
    };
  if (item.isSorryfulResult)
    return {
      label: "Sorryful Result",
      className:
        "bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400",
      tagText: `[sorryful result (${item.tag}): ${item.name}](https://physlib.io/todo#${item.tag})`,
    };
  if (item.isGitHubIssue)
    return {
      label: "GitHub Issue",
      className:
        "bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400",
      tagText: `[GitHub Issue: ${item.name}](${item.githubLink})`,
    };
  return {
    label: "TODO Item",
    className:
      "bg-teal-500/10 text-teal-700 border-teal-500/20 dark:text-teal-400",
    tagText: `[TODO (${item.tag}): file ${item.name}](https://physlib.io/todo#${item.tag})`,
  };
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
      className="px-2 py-0.5 rounded text-xs border border-border bg-surface hover:bg-surface-secondary transition-colors"
    >
      {copied ? "Copied!" : "Copy Tag"}
    </button>
  );
}

function TodoItemCard({ item }: { item: TodoItem }) {
  const type = itemTypeLabel(item);
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
      className="rounded-lg border border-border bg-surface px-4 py-3 flex flex-col gap-1.5 scroll-mt-20"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${type.className}`}
        >
          {type.label}
        </span>
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
          className="px-2 py-0.5 rounded text-xs border border-border bg-surface hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
        >
          {githubLabel} ↗
        </a>
        <a
          href={`#${item.tag}`}
          className="px-2 py-0.5 rounded text-xs border border-border bg-surface hover:bg-surface-secondary transition-colors text-muted hover:text-foreground"
        >
          Tag: {item.tag}
        </a>
        <CopyButton text={type.tagText} />
      </div>
    </div>
  );
}

export function TodoClient({ data }: { data: TodoData }) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    () => new Set(data.Category.map((c) => c.name)),
  );

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
      {/* Global filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              activeFilter === key
                ? "bg-accent text-white border-accent"
                : "border-border bg-surface hover:bg-surface-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-6">
        {data.Category.map((cat) => {
          const items = data.TODOItem.filter(
            (item) =>
              item.category === cat.name && matchesFilter(item, activeFilter),
          );
          if (items.length === 0) return null;
          const isOpen = openCategories.has(cat.name);

          return (
            <section key={cat.name}>
              <button
                onClick={() => toggleCategory(cat.name)}
                className="flex items-center gap-2 w-full text-left mb-3"
              >
                <h2 className="text-lg font-semibold">
                  {cat.name} {cat.emoji}
                </h2>
                <span className="text-xs text-muted border border-border rounded-full px-2 py-0.5">
                  {items.length}
                </span>
                <span className="ml-auto text-muted text-sm">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

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
