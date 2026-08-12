import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";

const dataDir = path.join(process.cwd(), "data");

async function loadYaml<T>(file: string): Promise<T> {
  const raw = await readFile(path.join(dataDir, file), "utf8");
  return yaml.load(raw) as T;
}

async function loadJson<T>(file: string): Promise<T> {
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

export type Maintainer = {
  name: string;
  summary: string;
};

export async function getMaintainers(): Promise<Maintainer[]> {
  return loadYaml<Maintainer[]>("Maintainers.yml");
}

export type NewsItem = {
  date: string;
  content: string;
};

export async function getNews(): Promise<NewsItem[]> {
  return loadYaml<NewsItem[]>("News.yml");
}

export type ApiStatus = "Complete" | "NeedsWork" | "StartedSoon" | "NotStarted";

export type ApiEntry = {
  title: string;
  content: string;
  status: ApiStatus;
  link?: string;
};

export async function getAPIs(): Promise<ApiEntry[]> {
  return loadYaml<ApiEntry[]>("APIs.yml");
}

export type TodoCategory = {
  name: string;
  num: number;
  emoji: string;
};

export type TodoItem = {
  file: string;
  githubLink: string;
  line: number;
  isInformalDef: boolean;
  isInformalLemma: boolean;
  isSemiFormalResult: boolean;
  isSorryfulResult: boolean;
  isGitHubIssue?: boolean;
  category: string;
  name: string;
  tag: string;
  content: string;
};

export type TodoData = {
  Category: TodoCategory[];
  TODOItem: TodoItem[];
  generatedAt?: string;
};

export async function getTodo(): Promise<TodoData> {
  return loadYaml<TodoData>("TODO.yml");
}

// ─── Monthly updates ──────────────────────────────────────────────────────
export type MonthlyContributor = {
  login: string | null;
  name?: string;
  html_url: string | null;
  avatar_url: string | null;
  commits: number;
  linesChanged: number;
};

/** Someone who reviewed a PR merged this month but didn't author a commit. */
export type MonthlyReviewer = {
  login: string;
  /** GitHub profile display name, when set. */
  name?: string;
  html_url: string | null;
  avatar_url: string | null;
  reviews: number;
};

export type MonthlyDeclaration = {
  file: string;
  kind: string;
  name: string;
  docstring: string | null;
  snippet: string;
  line: number;
};

export type MonthlyFileEntry = {
  filename: string;
  entries: MonthlyDeclaration[];
};

export type MonthlyUpdate = {
  slug: string;
  label: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  repo: string;
  branch: string;
  baseSha: string;
  headSha: string;
  compareUrl: string;
  commitsUrl: string;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  linesChanged: number;
  contributors: MonthlyContributor[];
  reviewers?: MonthlyReviewer[];
  kindTotals: Record<string, number>;
  files: MonthlyFileEntry[];
  /** Number of files that changed in this month's diff (superset of `files`,
   *  which only lists Lean files where new declarations were detected). */
  totalFilesChanged?: number;
  /** Whole files created / deleted in the diff. Renames count as neither. */
  filesAdded?: number;
  filesRemoved?: number;
  subfolders?: Array<{
    path: string;
    files: number;
    /** Whole files created / deleted within this subfolder. */
    filesAdded?: number;
    filesRemoved?: number;
    additions: number;
    deletions: number;
  }>;
  /** Public URL of the generated scientific-paper style PDF. */
  pdfUrl?: string;
  generatedAt: string;
};

const monthlyDir = path.join(dataDir, "monthly-updates");

async function safeReaddir(dir: string): Promise<string[]> {
  try {
    return await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/** Returns all monthly updates, newest first. */
export async function getMonthlyUpdates(): Promise<MonthlyUpdate[]> {
  const files = (await safeReaddir(monthlyDir)).filter((f) => f.endsWith(".json"));
  const items = await Promise.all(
    files.map((f) => loadJson<MonthlyUpdate>(path.join(monthlyDir, f))),
  );
  return items.sort((a, b) => b.slug.localeCompare(a.slug));
}
