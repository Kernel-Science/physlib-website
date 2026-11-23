"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { FindTask, FindTaskKind } from "@/lib/find-tasks";
import { site, todoTaskHref } from "@/lib/site";
import { getItemType, itemTypes, TodoItemCard } from "../todo/todo-client";
import { todoSubfield } from "../todo/todo-subfield";

const filters = [
  ["issue", "GitHub Issues"],
  ["todo", "Lean TODOs"],
  ["documentation", "Documentation"],
  ["api-map", "API Maps"],
] as const;

type Filter = FindTaskKind;

const pageSize = 25;
function taskSubfield(task: FindTask) {
  return task.todoItem ? todoSubfield(task.todoItem) : task.subfield;
}

function TaskSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
      {label}
      <span className="relative">
        <select className="site-field w-full appearance-none pr-9" value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <svg aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-foreground/65" viewBox="0 0 16 16" fill="none">
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

function TaskRows({ tasks }: { tasks: FindTask[] }) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => task.todoItem ? (
        <li key={task.id}>
          <TodoItemCard
            item={task.todoItem}
            tagHref={todoTaskHref(task.todoItem.tag)}
            compactLabels
            linkedIssue={task.kinds.includes("issue") ? { href: task.href, label: task.source, assignees: task.assignees } : undefined}
          />
        </li>
      ) : (
        <li key={task.id} className="grid min-w-0 gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-4">
          <a href={task.href} className="min-w-0 break-words font-medium text-foreground hover:text-accent hover:underline underline-offset-2">
            {task.title} <span aria-hidden="true" className="text-muted">↗</span>
          </a>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-foreground/65 sm:row-span-2 sm:flex-col sm:items-end">
            {task.source}
            {task.assignees && (task.assignees.length ? (
              <span>Assigned to {task.assignees.join(", ")}</span>
            ) : (
              <span className="rounded-(--radius) border border-green-500/20 bg-green-500/10 px-2 font-medium text-green-700 dark:text-green-400">
                Unassigned
              </span>
            ))}
          </span>
          {task.detail && (
            <p className="min-w-0 break-words text-sm leading-relaxed text-foreground/70 sm:col-start-1">
              {task.detail}
            </p>
          )}
          {task.unreviewed && (
            <p className="text-xs text-foreground/65 sm:col-start-1">
              Filed by an automated checker and not yet reviewed by a person. Confirm the error before fixing it.
            </p>
          )}
          {task.labels && task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:col-span-2">
              {task.labels.map((label) => (
                <span key={label} className="rounded-(--radius) border border-border bg-surface-secondary px-2 py-0.5 text-xs text-foreground/75">
                  {label}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TaskList({
  tasks,
  issuesAvailable,
  documentationAvailable,
  initialType,
  initialQuery,
}: {
  tasks: FindTask[];
  issuesAvailable: boolean;
  documentationAvailable: boolean;
  initialType?: string;
  initialQuery?: string;
}) {
  const [type, setType] = useState<Filter>(
    () => filters.find(([key]) => key === initialType)?.[0] ?? "issue",
  );
  const [query, setQuery] = useState(initialQuery ?? "");
  const [limit, setLimit] = useState(pageSize);
  const [subfield, setSubfield] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const tabTasks = tasks.filter((task) => task.kinds.includes(type));
  const subfields = type === "issue" ? [] : Array.from(new Set(
    tabTasks.map(taskSubfield).filter((name): name is string => Boolean(name)),
  )).sort((a, b) => a.localeCompare(b, "en"));

  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matchingSearch = tasks.filter((task) => {
    const kind = task.todoItem ? getItemType(task.todoItem) : null;
    const text = [task.title, task.detail, task.source, task.keywords, kind && itemTypes[kind].label]
      .join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });

  const results = matchingSearch.filter((task) => {
    if (!task.kinds.includes(type)) return false;
    if (subfields.length && subfield && subfield !== taskSubfield(task)) return false;
    return type !== "issue" || !unassignedOnly || task.assignees?.length === 0;
  });

  function updateFilters(nextType: Filter, nextQuery: string) {
    if (nextType !== type) setSubfield("");
    setType(nextType);
    setQuery(nextQuery);
    setLimit(pageSize);
    const url = new URL(window.location.href);
    url.hash = "";
    if (nextType === "issue") url.searchParams.delete("type");
    else url.searchParams.set("type", nextType);
    if (nextQuery.trim()) url.searchParams.set("q", nextQuery.trim());
    else url.searchParams.delete("q");
    // Keep a shareable URL without taking users away from the current results.
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      <div role="group" aria-label="Task type" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={type === key}
            onClick={() => updateFilters(key, query)}
            className="rounded-(--radius) border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-(--accent-tint) aria-pressed:text-accent"
          >
            {label}{words.length > 0 && (
              <span className="ml-1.5 text-foreground/65">
                {key === type ? results.length : matchingSearch.filter((task) => task.kinds.includes(key)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={`mt-5 grid max-w-4xl gap-3 ${subfields.length > 0 ? "sm:grid-cols-[minmax(0,1fr)_12rem]" : ""}`}>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
          Search tasks
          <input
            type="search"
            value={query}
            onChange={(event) => updateFilters(type, event.target.value)}
            placeholder="Search by topic, file, or issue number"
            className="site-field"
          />
        </label>
        {subfields.length > 0 && (
          <TaskSelect label="Subfield" value={subfield} onChange={(value) => { setSubfield(value); setLimit(pageSize); }}>
            <option value="">All subfields</option>
            {subfields.map((name) => <option key={name}>{name}</option>)}
          </TaskSelect>
        )}
      </div>

      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs sm:gap-x-5 sm:text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
          <p role="status" className="text-foreground/70">
            {results.length ? `${results.length} ${results.length === 1 ? "task" : "tasks"}` : "No tasks match these filters."}
          </p>
          {type === "issue" && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-foreground/80">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={unassignedOnly}
                onChange={(event) => { setUnassignedOnly(event.target.checked); setLimit(pageSize); }}
              />
              unassigned only
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(type === "issue" || !issuesAvailable) && (
            <a href={`${site.github}/issues`} className="text-accent hover:underline underline-offset-2">
              Browse issues on GitHub ↗
            </a>
          )}
          {type === "documentation" && (
            <Link href={site.documentationGuide} className="text-accent hover:underline underline-offset-2">
              Documentation help
            </Link>
          )}
          {type === "api-map" && (
            <Link href="/api-tracker" className="text-accent hover:underline underline-offset-2">
              Browse and edit maps
            </Link>
          )}
        </div>
      </div>

      {(!issuesAvailable || !documentationAvailable) && (
        <p className="mb-4 rounded-(--radius) border border-border px-3 py-2 text-sm text-foreground/75">
          {!issuesAvailable && "GitHub issues may be incomplete. "}
          {!documentationAvailable && "The documentation list is temporarily unavailable."}
        </p>
      )}

      {results.length > 0 && <TaskRows tasks={results.slice(0, limit)} />}

      {results.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((current) => current + pageSize)}
          className="mt-5 rounded-(--radius) border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:border-accent hover:text-accent"
        >
          Show more
        </button>
      )}
    </div>
  );
}
