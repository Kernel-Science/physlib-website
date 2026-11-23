import { readFile } from "node:fs/promises";
import path from "node:path";
import { navSections, site } from "./site";
import { getApiMap, getReferences, getTodo } from "./yaml";

export type SearchKind = "page" | "module" | "declaration" | "api-map" | "todo" | "reference";
export type SearchResult = { kind: SearchKind; title: string; href: string; description: string };
type Entry = { result: SearchResult; title: string; shortTitle: string; qualifiedName: string; text: string };
const leanIndexPath = path.join(process.cwd(), "data", "LeanSearchIndex.json");
const limit = 40;

function words(text: string) {
  return text.normalize("NFKC")
    .replace(/([\p{Ll}\d])([\p{Lu}])/gu, "$1 $2")
    .replace(/([\p{Lu}])([\p{Lu}][\p{Ll}])/gu, "$1 $2")
    .toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}

function clip(text: string, length: number) {
  return text.length <= length ? text : text.slice(0, length - 1).trimEnd() + "…";
}

function entry(kind: SearchKind, title: string, href: string, summary: string, extra = ""): Entry {
  const description = summary.replace(/\s+/g, " ").trim();
  return {
    result: { kind, title, href, description: clip(description, 220) },
    title: words(title),
    shortTitle: kind === "declaration" || kind === "module" ? words(title.split(".").at(-1)!) : "",
    qualifiedName: title.toLowerCase(),
    text: words([description, extra].join(" ")),
  };
}

// The navigation provides display aliases. These descriptions also cover local pages
// reached from article content, such as the contributor FAQ and new API map form.
const pages: Record<string, [string, string]> = {
  "/": ["Physlib", site.description],
  "/about": ["About Physlib", "Project overview, mission, values, impact, and beneficiaries."],
  "/about/mission": ["Mission", "Building a library of physics formalized in Lean."],
  "/about/values": ["Values", "Physlib’s principles for open and accessible collaboration."],
  "/about/beneficiaries": ["Beneficiaries", "Researchers, students, and organizations using formal physics."],
  "/about/impact": ["Impact", "Why formalize physics in Lean?"],
  [site.team]: ["Team", "Meet the maintainers and contributors who build Physlib."],
  "/getting-started": ["Getting Started", "Install Lean, set up Physlib, and make your first contribution."],
  "/gh-guide": ["GitHub contribution guide", "Fork the repository, create a branch, and open a pull request."],
  "/get-involved": ["Ways to contribute", "Find TODOs, open issues, and opportunities to work on Physlib."],
  "/faq": ["Contributor FAQ", "Frequently asked questions about making a first contribution."],
  "/project-ideas": ["Project ideas", "Suggested physics formalization projects and reading material."],
  "/dependencies": ["Dependency graphs", "Explore imports and dependencies between Lean modules."],
  "/docs/index.html": ["Lean documentation", "Browse the generated Lean module and declaration documentation."],
  "/documentation-tracker": ["Documentation Tracker", "Find Lean files that need documentation."],
  "/api-tracker": ["API Tracker", "Read API maps and follow links to the Lean declarations they describe."],
  "/api-tracker/new": ["Create an API map", "Start a new map of formalized physics results."],
  "/pr-tracker": ["Pull Request Triage", "Open pull requests and the reviews or actions they need."],
  "/todo": ["TODO List", "Open tasks, informal definitions and lemmas, semiformal and sorryful results, and GitHub issues."],
  "/references": ["References", "Search publications and citations used in Physlib."],
  "/monthly-updates": ["Monthly updates", "Monthly reports on changes and contributions to Physlib."],
  "/news": ["News", "Project news and announcements."],
  "/sponsor": ["Sponsor", "Financial support for Physlib."],
  [site.aiResources]: ["AI Resources", "AI contribution guidelines, companion tools, and reusable prompts."],
  "/ai-guidelines": ["AI guidelines", "Policy for using AI tools to contribute to Physlib."],
  "/physlib-ai-tools": ["PhyslibAItools", "AI-assisted tools for Lean contributions and maintenance."],
  "/prompts": ["Useful prompts", "Ready-made prompts for common Physlib tasks."],
};

function sitePages(hasDocs: boolean): Entry[] {
  const aliases = new Map<string, string[]>();
  for (const section of navSections) {
    for (const item of section.items) {
      const url = new URL(item.href, site.url);
      if (url.origin !== site.url || url.pathname === site.search) continue;
      const names = aliases.get(url.pathname) ?? [];
      names.push(section.label, item.label);
      aliases.set(url.pathname, names);
    }
  }
  const paths = new Set([...Object.keys(pages), ...aliases.keys()]);
  return Array.from(paths)
    .filter((href) => !href.startsWith("/docs/") || hasDocs)
    .map((href) => {
      const labels = aliases.get(href) ?? [];
      const [title, description] = pages[href] ?? [labels[labels.length - 1], labels[0]];
      return entry("page", title, href, description, labels.join(" "));
    });
}

type LeanHit = { kind: "module" | "declaration"; title: string; href: string; description: string; context: string };

async function leanEntries(): Promise<Entry[]> {
  let raw: string;
  try {
    raw = await readFile(leanIndexPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const hits: LeanHit[] = JSON.parse(raw);
  return hits.map(({ kind, title, href, description, context }) =>
    entry(kind, title, href, description, context));
}

async function buildIndex(): Promise<Entry[]> {
  const [lean, apiMap, todos, references] = await Promise.all([
    leanEntries(), getApiMap(), getTodo(), getReferences(),
  ]);
  const rows = [...sitePages(lean.length > 0), ...lean];
  for (const node of apiMap.nodes) {
    const content = node.content.flatMap((section) => [section.intro,
      ...section.subsections.map((sub) => sub.title + " " + sub.body)]);
    rows.push(entry("api-map", node.title, "/api-tracker#" + node.path, node.abstract,
      [node.path, ...content].join(" ")));
  }
  for (const item of todos.TODOItem) {
    const kind = item.isGitHubIssue ? "GitHub issue" : item.isInformalDef ? "Informal definition"
      : item.isInformalLemma ? "Informal lemma" : item.isSemiFormalResult ? "Semiformal result"
      : item.isSorryfulResult ? "Sorryful result" : "TODO";
    const title = item.name === item.file && item.content ? clip(item.content.trim().replace(/\s+/g, " "), 95) : item.name;
    rows.push(entry("todo", title, "/todo#" + encodeURIComponent(item.tag),
      `${kind} · ${item.file} — ${item.content}`, `${item.name} ${item.category} ${item.tag}`));
  }
  for (const ref of references.references) {
    const summary = [ref.authors.join(", "), ref.venue || ref.year].filter(Boolean).join(" · ");
    rows.push(entry("reference", ref.title ?? ref.key, "/references#reference-" + encodeURIComponent(ref.key),
      summary || ref.key, [ref.key, ref.year, ...ref.citations.map((citation) => citation.file)].join(" ")));
  }
  return rows;
}

let cached: Promise<Entry[]> | undefined;
function getIndex() {
  return cached ??= buildIndex().catch((error) => {
    cached = undefined;
    throw error;
  });
}

function score(row: Entry, raw: string, phrase: string, terms: string[]): number {
  if (row.qualifiedName === raw) return 1000;
  if (row.title === phrase) return 900;
  if (row.shortTitle === phrase) return 800;
  let points = row.title.includes(phrase) ? 90 : 0;
  if (row.text.includes(phrase)) points += 15;
  if (row.qualifiedName.includes(raw)) points += 60;
  for (const term of terms) {
    if (row.title.includes(term) || row.qualifiedName.includes(term)) points += 22;
    else if (row.text.includes(term)) points += 3;
    else return 0;
  }
  if (row.result.kind === "api-map" || row.result.kind === "page") points += 7;
  return points;
}

export async function searchPhyslib(query: string, scope: string = "all") {
  const raw = query.trim().slice(0, 200).toLowerCase();
  const phrase = words(query.trim().slice(0, 200));
  const counts: Record<SearchKind, number> = { page: 0, module: 0, declaration: 0, "api-map": 0, todo: 0, reference: 0 };
  if (!phrase) return { results: [] as SearchResult[], total: 0, counts };
  const terms = [...new Set(phrase.split(" "))];
  const ranked: { result: SearchResult; score: number }[] = [];
  for (const row of await getIndex()) {
    const relevance = score(row, raw, phrase, terms);
    if (relevance === 0) continue;
    counts[row.result.kind]++;
    if (scope === "all" || row.result.kind === scope) ranked.push({ result: row.result, score: relevance });
  }
  ranked.sort((a, b) => b.score - a.score || a.result.title.length - b.result.title.length
    || a.result.title.localeCompare(b.result.title));
  return { results: ranked.slice(0, limit).map((hit) => hit.result), total: ranked.length, counts };
}
