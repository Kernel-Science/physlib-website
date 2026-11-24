"use client";

import { useState, type ReactNode } from "react";
import { tagClass } from "@/lib/label-tone";
import Link from "next/link";
import type { FindTask, FindTaskKind } from "@/lib/find-tasks";
import { site, todoTaskHref } from "@/lib/site";
import { TodoItemCard } from "../todo/todo-client";
import { filterTaskSearch } from "@/lib/task-search";
import { todoSubfield } from "../todo/todo-subfield";

const filters = [
  ["issue", "GitHub Issues"],
  ["todo", "Lean TODOs"],
  ["documentation", "Documentation"],
  ["api-map", "Wiki Articles"],
] as const;

type Filter = FindTaskKind;

// What each tab holds and how to pick something up from it.
const tabHelp: Record<Filter, string> = {
  issue:
    "Open issues in the Physlib repository, good first issues and help-wanted issues first. Comment on an issue before you start work on it.",
  todo:
    "Informal results in the Lean files that still need a formal statement or proof, and TODO notes.",
  documentation:
    "Lean files that still need a module docstring.",
  "api-map":
    "Issues about Wiki articles, the Markdown guides that explain a topic and link to the relevant Lean declarations.",
};

// One-click searches for the things people most often look for in a tab.
const quickSearches: Partial<Record<Filter, string[]>> = {
  issue: ["good first issue", "help-wanted", "priority: High"],
  todo: ["Informal Lemma", "Informal Definition"],
};

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

function IssueActions({ step }: { step: NonNullable<FindTask["nextStep"]> }) {
  const [copyState, setCopyState] = useState<"ready" | "copied" | "manual">("ready");
  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(step.agentBrief);
      setCopyState("copied");
    } catch {
      setCopyState("manual");
    }
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:col-span-2">
      <a href={step.discussionUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-2">
        Volunteer on GitHub ↗
      </a>
      <button type="button" onClick={copyBrief} className="text-muted hover:text-accent hover:underline underline-offset-2">
        Copy task brief for an agent
      </button>
      <span role="status" className="text-xs text-muted">
        {copyState === "copied" && "Brief copied"}
        {copyState === "manual" && "Select and copy the brief below."}
      </span>
      {copyState === "manual" && (
        <textarea aria-label="Task brief for an agent" readOnly rows={5} value={step.agentBrief}
          onFocus={(event) => event.currentTarget.select()} className="site-field w-full" />
      )}
    </div>
  );
}

function TaskRows({ tasks, onLabel }: { tasks: FindTask[]; onLabel: (label: string) => void }) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => task.todoItem ? (
        <li key={task.id}>
          <TodoItemCard
            item={task.todoItem}
            tagHref={todoTaskHref(task.todoItem.tag)}
            compactLabels
            linkedIssue={task.kinds.includes("issue") ? { href: task.href, label: task.source, assignees: task.assignees } : undefined}
          >
            {task.nextStep && <IssueActions step={task.nextStep} />}
          </TodoItemCard>
        </li>
      ) : (
        <li key={task.id} className="grid min-w-0 gap-1.5 rounded-lg border border-border bg-surface px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-4">
          <a href={task.href} target="_blank" rel="noopener noreferrer" className="min-w-0 break-words font-medium text-foreground hover:text-accent hover:underline underline-offset-2">
            {task.title} <span aria-hidden="true" className="text-muted">↗</span>
          </a>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-foreground/65 sm:row-span-2 sm:flex-col sm:items-end">
            {task.source}
            {task.assignees && (task.assignees.length ? (
              <span>Assigned to {task.assignees.join(", ")}</span>
            ) : (
              <span className={tagClass("success")}>
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
                <button
                  key={label}
                  type="button"
                  onClick={() => onLabel(label)}
                  title={`Show tasks labeled ${label}`}
                  className={tagClass("neutral")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {task.nextStep && <IssueActions step={task.nextStep} />}
        </li>
      ))}
    </ul>
  );
}

export function TaskList({
  tasks,
  issuesAvailable,
  documentationAvailable,
  leanTodosAvailable,
  initialType,
  initialQuery,
  initialSubfield,
  initialUnassigned,
}: {
  tasks: FindTask[];
  issuesAvailable: boolean;
  documentationAvailable: boolean;
  leanTodosAvailable: boolean;
  initialType?: string;
  initialQuery?: string;
  initialSubfield?: string;
  initialUnassigned?: boolean;
}) {
  const [type, setType] = useState<Filter>(
    () => filters.find(([key]) => key === initialType)?.[0] ?? "issue",
  );
  const [query, setQuery] = useState(initialQuery ?? "");
  const [limit, setLimit] = useState(pageSize);
  const [chosenSubfield, setSubfield] = useState(initialSubfield ?? "");
  const [unassignedOnly, setUnassignedOnly] = useState(initialUnassigned ?? false);
  const tabTasks = tasks.filter((task) => task.kinds.includes(type));
  const subfields = type === "issue" ? [] : Array.from(new Set(
    tabTasks.map(taskSubfield).filter((name): name is string => Boolean(name)),
  )).sort((a, b) => a.localeCompare(b, "en"));
  // Ignore a subfield (for example from an old link) that this tab does not have.
  const subfield = subfields.includes(chosenSubfield) ? chosenSubfield : "";

  const matchingSearch = filterTaskSearch(tasks, query);

  const results = matchingSearch.filter((task) => {
    if (!task.kinds.includes(type)) return false;
    if (subfield && subfield !== taskSubfield(task)) return false;
    return type !== "issue" || !unassignedOnly || task.assignees?.length === 0;
  });

  const filtered = query.trim().length > 0 || subfield !== "" || (type === "issue" && unassignedOnly);

  function updateView(next: {
    type?: Filter;
    query?: string;
    subfield?: string;
    unassignedOnly?: boolean;
  }) {
    const nextType = next.type ?? type;
    const nextQuery = next.query ?? query;
    // A subfield belongs to one tab, so changing tab clears it.
    const nextSubfield = next.subfield ?? (nextType === type ? subfield : "");
    const nextUnassigned = next.unassignedOnly ?? unassignedOnly;
    setType(nextType);
    setQuery(nextQuery);
    setSubfield(nextSubfield);
    setUnassignedOnly(nextUnassigned);
    setLimit(pageSize);
    const url = new URL(window.location.href);
    url.hash = "";
    if (nextType === "issue") url.searchParams.delete("type");
    else url.searchParams.set("type", nextType);
    if (nextQuery.trim()) url.searchParams.set("q", nextQuery.trim());
    else url.searchParams.delete("q");
    if (nextSubfield && nextType !== "issue") url.searchParams.set("subfield", nextSubfield);
    else url.searchParams.delete("subfield");
    if (nextUnassigned && nextType === "issue") url.searchParams.set("unassigned", "1");
    else url.searchParams.delete("unassigned");
    // Keep a shareable URL without taking users away from the current results.
    window.history.replaceState(null, "", url);
  }

  const shown = Math.min(limit, results.length);
  const picks = quickSearches[type] ?? [];

  return (
    <div>
      <div role="group" aria-label="Task type" className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {filters.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={type === key}
            onClick={() => updateView({ type: key })}
            className="rounded-(--radius) border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-(--accent-tint) aria-pressed:text-accent"
          >
            {label}
            <span className="ml-1.5 font-normal text-foreground/65">
              {matchingSearch.filter((task) => task.kinds.includes(key)).length}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-foreground/70">{tabHelp[type]}</p>

      <div className={`mt-5 grid max-w-4xl gap-3 ${subfields.length > 0 ? "sm:grid-cols-[minmax(0,1fr)_12rem]" : ""}`}>
        <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">
          Search tasks
          <input
            type="search"
            value={query}
            onChange={(event) => updateView({ query: event.target.value })}
            placeholder="Search by topic, file, label, or issue number"
            className="site-field"
          />
        </label>
        {subfields.length > 0 && (
          <TaskSelect label="Subfield" value={subfield} onChange={(value) => updateView({ subfield: value })}>
            <option value="">All subfields</option>
            {subfields.map((name) => <option key={name}>{name}</option>)}
          </TaskSelect>
        )}
      </div>

      {picks.length > 0 && (
        <div role="group" aria-label="Common searches" className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-foreground/65">Common searches:</span>
          {picks.map((pick) => {
            const active = query.trim().toLowerCase() === pick.toLowerCase();
            return (
              <button
                key={pick}
                type="button"
                aria-pressed={active}
                onClick={() => updateView({ query: active ? "" : pick })}
                className="cursor-pointer rounded-(--radius) border border-border bg-surface-secondary px-2 py-0.5 text-foreground/75 hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-(--accent-tint) aria-pressed:text-accent"
              >
                {pick}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs sm:gap-x-5 sm:text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
          <p role="status" className="text-foreground/70">
            {results.length === 0
              ? "No tasks match these filters."
              : shown < results.length
                ? `Showing ${shown} of ${results.length} tasks`
                : `${results.length} ${results.length === 1 ? "task" : "tasks"}`}
          </p>
          {type === "issue" && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-foreground/80">
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={unassignedOnly}
                onChange={(event) => updateView({ unassignedOnly: event.target.checked })}
              />
              unassigned only
            </label>
          )}
          {filtered && (
            <button
              type="button"
              onClick={() => updateView({ query: "", subfield: "", unassignedOnly: false })}
              className="text-accent hover:underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(type === "issue" || !issuesAvailable) && (
            <a href={`${site.github}/issues`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-2">
              Browse issues on GitHub ↗
            </a>
          )}
          {type === "documentation" && (
            <Link href={site.documentationGuide} className="text-accent hover:underline underline-offset-2">
              Documentation help
            </Link>
          )}
          {type === "api-map" && (
            <Link href="/wiki" className="text-accent hover:underline underline-offset-2">
              Browse and edit Wiki articles
            </Link>
          )}
        </div>
      </div>

      {(!issuesAvailable || !documentationAvailable || !leanTodosAvailable) && (
        <p className="mb-4 rounded-(--radius) border border-border px-3 py-2 text-sm text-foreground/75">
          {!issuesAvailable && "GitHub issues may be incomplete. "}
          {!leanTodosAvailable && "Lean TODOs are temporarily unavailable. "}
          {!documentationAvailable && "The documentation list is temporarily unavailable."}
        </p>
      )}

      {results.length > 0 && <TaskRows tasks={results.slice(0, limit)} onLabel={(label) => updateView({ query: label })} />}

      {results.length === 0 && (
        <div className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-foreground/75">
          <p>Nothing in {filters.find(([key]) => key === type)?.[1]} matches.</p>
          <p className="mt-2">
            {filters.filter(([key]) => key !== type).map(([key, label]) => {
              const count = matchingSearch.filter((task) => task.kinds.includes(key)).length;
              return count > 0 && (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateView({ type: key })}
                  className="mx-2 text-accent hover:underline underline-offset-2"
                >
                  {count} in {label}
                </button>
              );
            })}
            {filtered && (
              <button
                type="button"
                onClick={() => updateView({ query: "", subfield: "", unassignedOnly: false })}
                className="mx-2 text-accent hover:underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
          </p>
        </div>
      )}

      {results.length > limit && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLimit((current) => current + pageSize)}
            className="rounded-(--radius) border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Show {Math.min(pageSize, results.length - limit)} more
          </button>
          <button
            type="button"
            onClick={() => setLimit(results.length)}
            className="rounded-(--radius) border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Show all {results.length}
          </button>
        </div>
      )}
    </div>
  );
}
