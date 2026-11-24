import { site } from "@/lib/site";
import { getTodo, type TodoItem } from "@/lib/yaml";

export type FindTaskKind = "issue" | "todo" | "documentation" | "api-map";

export type FindTask = {
  id: string;
  repository: string;
  title: string;
  detail: string;
  href: string;
  kinds: FindTaskKind[];
  source: string;
  keywords?: string;
  todoItem?: TodoItem;
  labels?: string[];
  assignees?: string[];
  nextStep?: {
    action: "volunteer_on_github";
    discussionUrl: string;
    guideUrl: string;
    agentBrief: string;
  };
  subfield?: string;
  /** Set when the issue body says an LLM filed it and no person has checked it. */
  unreviewed?: boolean;
};

const libraryRepository = new URL(site.github).pathname.slice(1);
const websiteRepository = new URL(site.websiteRepo).pathname.slice(1);
const documentationExemptions = "scripts/lint/exemptions/module_doc_no_lint.txt";
const revalidate = 15 * 60;

type GitHubIssue = {
  number: number;
  title: string;
  body: string | null;
  labels: { name: string }[];
  assignees: { login: string }[];
};

export function textPreview(text: string, limit: number): string {
  const plainText = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, "")
    .replace(/\[([^\]\n]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/`+/g, "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plainText.length <= limit) return plainText;
  const cut = plainText.slice(0, limit);
  const space = cut.lastIndexOf(" ");
  return `${space > limit / 2 ? cut.slice(0, space) : cut}…`;
}

const llmNotice = /^>.*Found by a local LLM/i;

/**
 * Issues filed by the documentation-mistake finder all open with the same
 * warning block, a rule and a "Summary" heading. Drop those so the preview
 * shows what the issue is about; the warning is kept as `unreviewed`.
 */
function issueBody(body: string | null): { text: string; unreviewed: boolean } {
  const lines = (body ?? "").split(/\r?\n/);
  const unreviewed = llmNotice.test(lines.find((line) => line.trim()) ?? "");
  if (!unreviewed) return { text: body ?? "", unreviewed };
  let start = 0;
  while (start < lines.length && /^\s*(>.*|-{3,}|#{1,6}\s*Summary)?\s*$/i.test(lines[start])) start++;
  return { text: lines.slice(start).join("\n"), unreviewed };
}

function isGitHubIssue(value: unknown): value is GitHubIssue {
  if (!value || typeof value !== "object" || "pull_request" in value) return false;
  const issue = value as GitHubIssue;
  return Number.isSafeInteger(issue.number) && issue.number > 0 &&
    typeof issue.title === "string" && issue.title.trim().length > 0 &&
    (typeof issue.body === "string" || issue.body === null) &&
    Array.isArray(issue.labels) && issue.labels.every((label) => typeof label?.name === "string") &&
    Array.isArray(issue.assignees) && issue.assignees.every((assignee) => typeof assignee?.login === "string");
}

async function getOpenIssues(repository: string): Promise<{ issues: GitHubIssue[]; complete: boolean }> {
  const issues = new Map<number, GitHubIssue>();
  for (let page = 1; page <= 10; page++) {
    try {
      const query = new URLSearchParams({
        state: "open",
        sort: "created",
        direction: "desc",
        per_page: "100",
        page: String(page),
      });
      const response = await fetch(`https://api.github.com/repos/${repository}/issues?${query}`, {
        headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
        next: { revalidate },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) break;
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || !rows.every((row) =>
        isGitHubIssue(row) || (row && typeof row === "object" && "pull_request" in row),
      )) break;
      for (const issue of rows.filter(isGitHubIssue)) issues.set(issue.number, issue);
      if (!response.headers.get("link")?.includes('rel="next"')) {
        return { issues: [...issues.values()], complete: true };
      }
    } catch {
      break;
    }
  }
  return { issues: [...issues.values()], complete: false };
}

async function getDocumentationFiles(): Promise<string[] | null> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${libraryRepository}/master/${documentationExemptions}`,
      { next: { revalidate }, signal: AbortSignal.timeout(5_000) },
    );
    if (!response.ok) return null;
    const files = (await response.text()).split("\n").map((line) => line.trim()).filter(Boolean);
    if (files.some((path) => !path.endsWith(".lean") || path.split("/").some(
      (part) => !part || part === "." || part === "..",
    ))) return null;

    return [...new Set(files)].sort();
  } catch {
    return null;
  }
}

function todoKeywords(item: TodoItem): string {
  return [item.category, item.file, item.name, item.tag, item.legacyTag, item.content].join(" ");
}

function leanTask(item: TodoItem): FindTask {
  return {
    id: `lean-${item.tag}`,
    repository: libraryRepository,
    title: textPreview(item.content, 160) || item.name,
    detail: item.file,
    href: item.githubLink,
    kinds: ["todo"],
    source: "Lean TODO",
    keywords: todoKeywords(item),
    todoItem: item,
  };
}

function subfieldFromPath(path: string): string | undefined {
  const [library, subject] = path.split("/");
  if (library === "QuantumInfo") return "Quantum Information";
  if ((library === "Physlib" || library === "PhyslibAlpha") && subject && !subject.includes(".")) {
    return subject.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  }
}

function apiMapSubfield(body: string | null): string | undefined {
  const record = body?.match(/<!--\s*api-map-edit\r?\n([^\r\n]+)\r?\n-->/)?.[1];
  if (!record) return;
  try {
    const meta = JSON.parse(record);
    if (meta?.format === "api-map-edit" && typeof meta.file === "string" && meta.file.endsWith("/API-map.md")) {
      return subfieldFromPath(meta.file);
    }
  } catch {
    // A malformed suggestion does not establish a subfield.
  }
}

function documentationTask(path: string): FindTask {
  return {
    id: `docs-${path}`,
    repository: libraryRepository,
    title: path.replace(/\.lean$/, "").split("/").slice(-2).join(" / "),
    detail: path,
    href: `${site.github}/blob/master/${path.split("/").map(encodeURIComponent).join("/")}`,
    kinds: ["documentation"],
    source: "Needs a module docstring",
    subfield: subfieldFromPath(path),
  };
}

function issueKinds(title: string, labels: string[], isTodo: boolean): FindTaskKind[] {
  const kinds: FindTaskKind[] = ["issue"];
  if (isTodo) kinds.push("todo");
  if (/\bapi[\s-]+maps?\b/i.test(title) || labels.some((label) => /^api(?:[\s-]+maps?)?$/i.test(label))) {
    kinds.push("api-map");
  }
  return kinds;
}

function issueTask(repository: string, issue: GitHubIssue, linkedTodo?: TodoItem): FindTask {
  const labels = issue.labels.map(({ name }) => name);
  const subfield = apiMapSubfield(issue.body);
  const { text, unreviewed } = issueBody(issue.body);
  const href = `https://github.com/${repository}/issues/${issue.number}`;
  const guideUrl = repository === libraryRepository
    ? `${site.url}/getting-started#first-contribution`
    : `${site.websiteRepo}/tree/main/web2`;
  return {
    id: repository === libraryRepository ? `issue-${issue.number}` : `website-issue-${issue.number}`,
    repository,
    title: issue.title,
    detail: linkedTodo?.file || textPreview(text, 220) || labels.join(", "),
    href,
    kinds: issueKinds(issue.title, labels, Boolean(linkedTodo)),
    source: `GitHub #${issue.number}`,
    keywords: [labels.join(" "), linkedTodo && todoKeywords(linkedTodo)].filter(Boolean).join(" "),
    todoItem: linkedTodo,
    labels,
    assignees: issue.assignees.map(({ login }) => login),
    nextStep: issue.assignees.length === 0 ? {
      action: "volunteer_on_github",
      discussionUrl: href,
      guideUrl,
      agentBrief: [
        `${repository}#${issue.number} — ${issue.title}`,
        href,
        "Check the current assignees and recent comments. If this work is available, help me draft a comment describing the part I would like to take on.",
        `Contribution guide: ${guideUrl}`,
      ].join("\n\n"),
    } : undefined,
    subfield,
    unreviewed: unreviewed || undefined,
  };
}

export function issuePriority(task: FindTask): number {
  if (!task.kinds.includes("issue")) return 4;
  if (task.assignees?.length !== 0) return 3;
  if (task.labels?.some((label) => /^good first issue$/i.test(label))) return 0;
  if (task.labels?.some((label) => /^help[- ]wanted$/i.test(label))) return 1;
  return 2;
}

export async function getWebsiteIssues(): Promise<{ tasks: FindTask[]; complete: boolean }> {
  const { issues, complete } = await getOpenIssues(websiteRepository);
  return {
    tasks: issues.map((issue) => issueTask(websiteRepository, issue))
      .sort((a, b) => issuePriority(a) - issuePriority(b)),
    complete,
  };
}

export async function getFindTasks({ includeSavedIssues = true } = {}): Promise<{
  tasks: FindTask[];
  issuesAvailable: boolean;
  documentationAvailable: boolean;
  leanTodosAvailable: boolean;
}> {
  const [todo, { issues, complete }, documentationFiles] = await Promise.all([
    getTodo().catch(() => null),
    getOpenIssues(libraryRepository),
    getDocumentationFiles(),
  ]);

  const leanTodos = new Map<string, TodoItem>();
  for (const item of todo?.TODOItem ?? []) {
    if (!item.isGitHubIssue) leanTodos.set(item.tag, item);
  }

  const linkedTags = new Set<string>();
  const issueTasks = new Map<string, FindTask>();
  for (const issue of issues) {
    const linkedTag = issue.body?.match(/<!--\s*physlib-todo-tag:\s*(\d+)\s*-->/)?.[1];
    const linkedTodo = linkedTag ? leanTodos.get(linkedTag) : undefined;
    if (linkedTodo) linkedTags.add(linkedTodo.tag);
    const task = issueTask(libraryRepository, issue, linkedTodo);
    issueTasks.set(task.id, task);
  }

  if (includeSavedIssues && !complete) {
    for (const item of todo?.TODOItem ?? []) {
      const number = item.githubLink.startsWith(`${site.github}/issues/`)
        ? item.githubLink.match(/\/issues\/(\d+)$/)?.[1]
        : undefined;
      if (!item.isGitHubIssue || !number || issueTasks.has(`issue-${number}`)) continue;
      issueTasks.set(`issue-${number}`, {
        id: `issue-${number}`,
        repository: libraryRepository,
        title: item.name,
        detail: textPreview(item.content, 220),
        href: item.githubLink,
        kinds: issueKinds(item.name, [], false),
        source: `Saved GitHub #${number}`,
      });
    }
  }

  const tasks = [
    ...[...issueTasks.values()].sort((a, b) => issuePriority(a) - issuePriority(b)),
    ...[...leanTodos.values()].filter((item) => !linkedTags.has(item.tag)).map(leanTask),
    ...(documentationFiles ?? []).map(documentationTask),
  ];

  return {
    tasks,
    issuesAvailable: complete,
    documentationAvailable: documentationFiles !== null,
    leanTodosAvailable: todo !== null,
  };
}
