import { z } from "zod/v4";
import { getFindTasks, getWebsiteIssues, issuePriority, textPreview, type FindTask } from "@/lib/find-tasks";
import { filterTaskSearch } from "@/lib/task-search";

export const taskQuerySchema = z.object({
  q: z.string().trim().max(200).optional().describe("Match all words in task titles, summaries, labels, or Lean task details."),
  kind: z.enum(["issue", "todo", "documentation", "api-map"]).optional().describe("Restrict to a task kind. A GitHub issue may also be a Lean TODO or an API map task."),
  repository: z.enum(["library", "website"]).optional().describe("Search the Physlib Lean library or the Physlib website. Omit to search both."),
  label: z.string().trim().min(1).max(100).optional().describe("Match an exact GitHub issue label, ignoring case."),
  unassigned: z.boolean().optional().describe("When true, return only GitHub issues with a confirmed empty assignee list."),
  limit: z.number().int().min(1).max(100).optional().describe("Results per page, from 1 to 100. Defaults to 20."),
  offset: z.number().int().nonnegative().optional().describe("Number of matching tasks to skip. Defaults to zero."),
}).strict();

export type TaskQuery = z.input<typeof taskQuerySchema>;
export class TaskQueryError extends Error {}

export function parseTaskQuery(params: URLSearchParams): TaskQuery {
  const values: Record<string, unknown> = Object.create(null);
  for (const [key, value] of params) {
    if (Object.hasOwn(values, key)) throw new TaskQueryError(`Pass ${key} only once.`);
    if ((key === "offset" || key === "limit") && /^\d+$/.test(value)) {
      values[key] = Number(value);
    } else if (key === "unassigned" && (value === "true" || value === "false")) {
      values[key] = value === "true";
    } else {
      values[key] = value;
    }
  }
  const parsed = taskQuerySchema.safeParse(values);
  if (!parsed.success) {
    throw new TaskQueryError(parsed.error.issues.map(({ path, message }) =>
      path.length ? `${path.join(".")}: ${message}` : message,
    ).join(" "));
  }
  return parsed.data;
}

function taskRecord(task: FindTask) {
  const item = task.todoItem;
  return {
    id: task.id,
    title: task.title,
    summary: item ? textPreview(item.content, 220) : task.detail,
    kinds: task.kinds,
    repository: task.repository,
    source: task.source,
    url: task.href,
    labels: task.labels,
    assignees: task.assignees,
    nextStep: task.nextStep,
    unreviewed: task.unreviewed,
    todo: item ? {
      tag: item.tag,
      file: item.file.replaceAll(".", "/") + ".lean",
      line: item.line,
      url: item.githubLink,
    } : undefined,
  };
}

export async function searchTasks(params: TaskQuery) {
  const { q = "", kind, repository, label, unassigned, limit = 20, offset = 0 } = taskQuerySchema.parse(params);
  const [library, website] = await Promise.all([
    repository === "website" ? null : getFindTasks({ includeSavedIssues: false }),
    repository === "library" || kind === "todo" || kind === "documentation" ? null : getWebsiteIssues(),
  ]);
  const tasks = [...(library?.tasks ?? []), ...(website?.tasks ?? [])];
  const requestedLabel = label?.toLowerCase();
  const results = filterTaskSearch(tasks, q).filter((task) =>
    (!kind || task.kinds.includes(kind)) &&
    (!requestedLabel || task.labels?.some((name) => name.toLowerCase() === requestedLabel)) &&
    (!unassigned || task.assignees?.length === 0),
  ).sort((a, b) => issuePriority(a) - issuePriority(b));

  return {
    tasks: results.slice(offset, offset + limit).map(taskRecord),
    total: results.length,
    limit,
    offset,
    nextOffset: offset + limit < results.length ? offset + limit : null,
    sources: {
      ...(library && {
        libraryIssues: library.issuesAvailable,
        leanTodos: library.leanTodosAvailable,
        documentation: library.documentationAvailable,
      }),
      ...(website && { websiteIssues: website.complete }),
    },
  };
}
