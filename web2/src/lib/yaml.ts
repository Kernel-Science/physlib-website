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

// ─── API map ────────────────────────────────────────────────────────────
// Generated from Physlib's API-map.md files by scripts/generate-api-map.js.

/** Another API map this one cites in its references - the edges of the
 *  dependency map. */
export type ApiMapParent = {
  name: string;
  path: string;
};

/** One claim of the content: a run of `[n]` citations, done unless the run
 *  contains `[TODO]`. Only counted, for the progress shown on the page. */
export type ApiMapRequirement = {
  done: boolean;
  citations: number[];
  alpha: boolean;
};

/** A declaration named in a Lean reference. `fullName` is present when it
 *  was found in the cited file, and is what doc-gen4 anchors on; notations
 *  and instance types (`kind` "notation" / "instance") are never resolved. */
export type ApiMapDeclaration = {
  text: string;
  fullName?: string;
  kind?: string;
  line?: number;
  doc?: string | null;
  signature?: string | null;
};

/** One entry of `## Lean References`, cited in the content as `[index]`. */
export type ApiMapLeanReference = {
  index: number;
  file: string;
  exists: boolean;
  declarations: ApiMapDeclaration[];
};

/** One entry of `## References`, cited in the content as `{index}`.
 *  `apiMap` is the directory of the API map it points at, when it is one. */
export type ApiMapReference = {
  index: number;
  text: string;
  apiMap: string | null;
};

/** One `### ` subsection of a content section, verbatim markdown. */
export type ApiMapSubsection = {
  title: string;
  body: string;
};

/** A `## Content` or `## Content (Alpha)` section: the text before its first
 *  subsection, then the subsections. */
export type ApiMapContentSection = {
  heading: string;
  alpha: boolean;
  intro: string;
  subsections: ApiMapSubsection[];
};

export type ApiMapNode = {
  /** The API's directory, which is also its id on the page. */
  path: string;
  /** The API-map.md itself. */
  file: string;
  title: string;
  /** Whether the abstract is `## Abstract (Alpha)`. */
  alpha: boolean;
  abstract: string;
  abstractHeading: string;
  content: ApiMapContentSection[];
  leanReferences: ApiMapLeanReference[];
  references: ApiMapReference[];
  requirements: ApiMapRequirement[];
  parents: ApiMapParent[];
  url: string;
};

/** A directory of the libraries holding Lean files - a place a new API map
 *  could go. */
export type ApiMapDirectory = {
  path: string;
  leanFiles: number;
  hasApiMap: boolean;
};

export type ApiMap = {
  repo: string;
  branch: string;
  /** The Physlib commit the maps were read at. */
  commit: string;
  generatedAt: string;
  nodes: ApiMapNode[];
  directories: ApiMapDirectory[];
};

export async function getApiMap(): Promise<ApiMap> {
  return loadJson<ApiMap>(path.join(dataDir, "APIMap.json"));
}

// ─── References ─────────────────────────────────────────────────────────────
export type ReferenceCitation = {
  file: string;
  line: number;
  subfolder: string;
  url: string;
};

export type Reference = {
  key: string;
  inBib: boolean;
  type: string | null;
  authors: string[];
  authorSortKey: string;
  title: string | null;
  year: string | null;
  venue: string;
  url: string | null;
  citations: ReferenceCitation[];
  count: number;
};

export type ReferenceLibrary = {
  repo: string;
  branch: string;
  generatedAt: string;
  references: Reference[];
};

export async function getReferences(): Promise<ReferenceLibrary> {
  return loadJson<ReferenceLibrary>(path.join(dataDir, "References.json"));
}

// ─── Monthly updates ──────────────────────────────────────────────────────
export type MonthlyContributor = {
  login: string | null;
  name?: string;
  html_url: string | null;
  avatar_url: string | null;
  commits: number;
  linesChanged: number;
  /** True when this contributor has no commits before the reporting window. */
  firstTime?: boolean;
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
  /** DOI of the Zenodo record archiving this month's PDF, once minted. */
  zenodoDoi?: string;
  /** Direct link to the Zenodo record, once published. */
  zenodoUrl?: string;
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
