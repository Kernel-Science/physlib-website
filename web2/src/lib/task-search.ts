import type { FindTask } from "@/lib/find-tasks";
import type { TodoItem } from "@/lib/yaml";

export const itemTypes = {
  informalDef: {
    label: "Informal Definition",
    className: "site-tag-accent",
    tagPrefix: "informal_def",
  },
  informalLemma: {
    label: "Informal Lemma",
    className: "site-tag-warning",
    tagPrefix: "informal_lemma",
  },
  semiformal: {
    label: "Semiformal Result",
    className: "site-tag-accent",
    tagPrefix: "semiformal_result",
  },
  sorryful: {
    label: "Sorryful Result",
    className: "site-tag-danger",
    tagPrefix: "sorryful result",
  },
  todo: {
    label: "TODO Item",
    className: "site-tag-neutral",
    tagPrefix: "TODO",
  },
  githubIssue: {
    label: "GitHub Issue",
    className: "site-tag-success",
  },
};

export type ItemType = keyof typeof itemTypes;

export function getItemType(item: TodoItem): ItemType {
  if (item.isGitHubIssue) return "githubIssue";
  if (item.isInformalDef) return "informalDef";
  if (item.isInformalLemma) return "informalLemma";
  if (item.isSemiFormalResult) return "semiformal";
  if (item.isSorryfulResult) return "sorryful";
  return "todo";
}

export function filterTaskSearch(tasks: FindTask[], query: string): FindTask[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return tasks;

  return tasks.filter((task) => {
    const kind = task.todoItem ? getItemType(task.todoItem) : null;
    const text = [task.title, task.detail, task.source, task.keywords, kind && itemTypes[kind].label]
      .join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
