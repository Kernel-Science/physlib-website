import type {
  ApiMapContentSection,
  ApiMapLeanReference,
  ApiMapNode,
  ApiMapReference,
} from "@/lib/yaml";

/**
 * Turning an API-map.md (as data/APIMap.json carries it) into the sections of
 * the article page, and back into markdown for the edit view.
 *
 * The page mirrors the file's own shape: the abstract is the lead, each `###`
 * subsection of the content is a section, and the Lean references and
 * literature references close the article. Every piece the reader can edit
 * keeps the exact markdown it came from, so a suggested edit is a diff
 * against the real file text.
 */

// ─── Links ──────────────────────────────────────────────────────────────────

/** The doc-gen4 page for a Lean file, anchored on a declaration when its
 *  fully-qualified name is known. The docs are served by this site under
 *  /docs (see scripts/download-docs.js). */
export function docsUrl(file: string, fullName?: string): string {
  const page = `/docs/${file.replace(/\.lean$/, "")}.html`;
  return fullName ? `${page}#${fullName}` : page;
}

export function sourceUrl(repo: string, branch: string, file: string, line?: number): string {
  return `https://github.com/${repo}/blob/${branch}/${file}${line ? `#L${line}` : ""}`;
}

export function historyUrl(repo: string, branch: string, file: string): string {
  return `https://github.com/${repo}/commits/${branch}/${file}`;
}

export function treeUrl(repo: string, branch: string, dir: string): string {
  return `https://github.com/${repo}/tree/${branch}/${dir}`;
}

/** GitHub's editor for an existing file - it forks and opens a PR for the
 *  reader on commit. */
export function editFileUrl(repo: string, branch: string, file: string): string {
  return `https://github.com/${repo}/edit/${branch}/${file}`;
}

/** The open issues filed about one API map, Physlib's equivalent of a talk
 *  page. */
export function talkUrl(repo: string, title: string): string {
  const q = `is:issue is:open label:API "${title}"`;
  return `https://github.com/${repo}/issues?q=${encodeURIComponent(q)}`;
}

/** The page of an API map on this site. */
export const apiMapHref = (path: string) => `/api-tracker#${path}`;

/** `Physlib/SpaceAndTime/Time` → `Physlib.SpaceAndTime.Time`. */
export const moduleOf = (path: string) => path.replace(/\//g, ".");

// ─── Sections ───────────────────────────────────────────────────────────────

/**
 * What a suggested edit does to API-map.md, in the terms a bot applying it
 * would need. Headings are given without their `## ` / `### ` markers.
 * See src/lib/api-map-issue.ts for how it is written into the issue.
 */
export type EditOperation =
  /** Replace the body of the abstract section `heading`. */
  | { op: "replace-abstract"; heading: string }
  /** Replace the `## section`, heading and all, up to the next `## `. */
  | { op: "replace-section"; section: string }
  /** Replace `### subsection` of `## section`, heading and all, up to the
   *  next `### ` or `## `. */
  | { op: "replace-subsection"; section: string; subsection: string }
  /** Replace everything from the abstract's `## ` heading up to
   *  `## Lean References`. */
  | { op: "replace-article" }
  /** Insert a new `### ` subsection into `## section` - after `### after`,
   *  or at the start of the section when `after` is null. With `create`, the
   *  section doesn't exist yet: add it after `## create.after` (after the
   *  abstract when null). */
  | {
      op: "add-subsection";
      section: string;
      after: string | null;
      create?: { after: string | null };
    }
  /** Create the file. */
  | { op: "create-file" };

/** What a reader's edit replaces in the file. */
export type EditTarget = {
  /** Shown in the editor and the issue - "the abstract", a subsection title. */
  label: string;
  /** Where in API-map.md the text lives, for the maintainer reading the issue. */
  location: string;
  /** The exact current markdown. */
  source: string;
  /** The abstract alone, one section (starting at its heading), the whole
   *  editable article, or a section that doesn't exist yet. */
  shape: "lead" | "section" | "article" | "new";
  operation: EditOperation;
};

export type ArticleSection = {
  id: string;
  number: string;
  title: string;
  level: 2 | 3;
  /** Markdown under the heading (not including it). */
  body: string;
  alpha: boolean;
  edit: EditTarget;
};

export type Article = {
  lead: string;
  /** Whether the abstract is `## Abstract (Alpha)`. */
  leadAlpha: boolean;
  leadEdit: EditTarget;
  /** Content text that precedes any subsection heading. */
  intro: { body: string; alpha: boolean }[];
  sections: ArticleSection[];
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/** Builds the article for a map's sections. Takes the pieces rather than the
 *  node so the edit preview can run a reader's edited markdown through it. */
export function buildArticle(
  abstractHeading: string,
  abstract: string,
  content: ApiMapContentSection[],
): Article {
  const sections: ArticleSection[] = [];
  const intro: Article["intro"] = [];
  const used = new Set<string>();
  const uniqueId = (title: string) => {
    let id = `apimap-${slug(title) || "section"}`;
    for (let n = 2; used.has(id); n++) id = `apimap-${slug(title)}-${n}`;
    used.add(id);
    return id;
  };

  // A single content section - every current map - flattens: its
  // subsections become the article's sections. With both `## Content` and
  // `## Content (Alpha)`, each is a section and its subsections nest.
  const nested = content.length > 1;
  content.forEach((c, ci) => {
    if (nested) {
      sections.push({
        id: uniqueId(c.heading),
        number: String(ci + 1),
        title: c.heading,
        level: 2,
        body: c.intro,
        alpha: c.alpha,
        edit: {
          label: c.heading,
          location: `the whole \`## ${c.heading}\` section`,
          source: contentSectionSource(c),
          shape: "section",
          operation: { op: "replace-section", section: c.heading },
        },
      });
    } else if (c.intro) {
      intro.push({ body: c.intro, alpha: c.alpha });
    }
    c.subsections.forEach((s, si) => {
      sections.push({
        id: uniqueId(s.title),
        number: nested ? `${ci + 1}.${si + 1}` : String(si + 1),
        title: s.title,
        level: nested ? 3 : 2,
        body: s.body,
        alpha: c.alpha,
        edit: {
          label: s.title,
          location: `the subsection \`### ${s.title}\` of \`## ${c.heading}\``,
          source: `### ${s.title}\n\n${s.body}`,
          shape: "section",
          operation: { op: "replace-subsection", section: c.heading, subsection: s.title },
        },
      });
    });
  });

  return {
    lead: abstract,
    leadAlpha: abstractHeading.endsWith("(Alpha)"),
    leadEdit: {
      label: "Abstract",
      location: `the \`## ${abstractHeading}\` section`,
      source: abstract,
      shape: "lead",
      operation: { op: "replace-abstract", heading: abstractHeading },
    },
    intro,
    sections,
  };
}

function contentSectionSource(c: ApiMapContentSection): string {
  return [
    `## ${c.heading}`,
    ...(c.intro ? [c.intro] : []),
    ...c.subsections.map((s) => `### ${s.title}\n\n${s.body}`),
  ].join("\n\n");
}

/** The editable part of an API-map.md - abstract and content - as markdown. */
export function articleSource(node: ApiMapNode): string {
  return [
    `## ${node.abstractHeading}`,
    node.abstract,
    ...node.content.map(contentSectionSource),
  ].join("\n\n");
}

export function wholeArticleTarget(node: ApiMapNode): EditTarget {
  return {
    label: "the abstract and content",
    location: "everything from the abstract down to `## Lean References`",
    source: articleSource(node),
    shape: "article",
    operation: { op: "replace-article" },
  };
}

export const NEW_SECTION_TITLE = "Title of the new section";

/** The skeleton a new section starts from. */
export const NEW_SECTION_TEMPLATE = [
  `### ${NEW_SECTION_TITLE}`,
  "",
  "State the concept as you would explain it to a colleague, then cite the Lean",
  "declarations that formalize it. [TODO]",
].join("\n");

/** The subsections a new section can be placed after: those of the map's
 *  `## Content (Alpha)`, where new text goes since it is not yet reviewed. */
export function newSectionPositions(node: ApiMapNode): string[] {
  return node.content.find((c) => c.alpha)?.subsections.map((s) => s.title) ?? [];
}

/**
 * Adding a section. New text is unreviewed, so it goes into
 * `## Content (Alpha)` - after the subsection `after`, or at its start when
 * `after` is null - and when the map has no such section, into a new one
 * after the existing content.
 */
export function newSectionTarget(node: ApiMapNode, after: string | null): EditTarget {
  const alpha = node.content.find((c) => c.alpha);
  let location: string;
  let operation: EditOperation;
  if (alpha) {
    location = after
      ? `a new subsection of \`## ${alpha.heading}\`, placed after \`### ${after}\``
      : `a new subsection at the start of \`## ${alpha.heading}\``;
    operation = { op: "add-subsection", section: alpha.heading, after };
  } else {
    const last = node.content[node.content.length - 1];
    location = last
      ? `a new subsection in a new \`## Content (Alpha)\` section, placed after \`## ${last.heading}\``
      : "a new subsection in a new `## Content (Alpha)` section, placed after the abstract";
    operation = {
      op: "add-subsection",
      section: "Content (Alpha)",
      after: null,
      create: { after: last ? last.heading : null },
    };
  }
  return { label: "New section", location, source: NEW_SECTION_TEMPLATE, shape: "new", operation };
}

/**
 * Reads markdown back into abstract and content - the inverse of
 * `articleSource`, used to preview an edit. Like Physlib's own reader it is
 * forgiving: a `###` before any `##` lands in an untitled content section.
 */
export function parseArticleSource(text: string): {
  abstractHeading: string;
  abstract: string;
  content: ApiMapContentSection[];
} {
  let abstractHeading = "Abstract";
  const abstract: string[] = [];
  const content: ApiMapContentSection[] = [];
  let mode: "abstract" | "content" = "abstract";
  let sub: { title: string; body: string[] } | null = null;
  let intro: string[] = [];
  let current: ApiMapContentSection | null = null;
  const flush = () => {
    if (current) {
      if (sub) current.subsections.push({ title: sub.title, body: sub.body.join("\n").trim() });
      current.intro = intro.join("\n").trim();
    }
    sub = null;
    intro = [];
  };
  const openContent = (heading: string) => {
    flush();
    current = { heading, alpha: heading.endsWith("(Alpha)"), intro: "", subsections: [] };
    content.push(current);
    mode = "content";
  };
  for (const line of text.split("\n")) {
    if (/^## /.test(line)) {
      const heading = line.slice(3).trim();
      if (/^Abstract/.test(heading)) {
        flush();
        current = null;
        mode = "abstract";
        abstractHeading = heading;
      } else {
        openContent(heading);
      }
      continue;
    }
    if (/^### /.test(line)) {
      if (!current) openContent("Content (Alpha)");
      const c = current as unknown as ApiMapContentSection;
      if (sub) c.subsections.push({ title: sub.title, body: sub.body.join("\n").trim() });
      sub = { title: line.slice(4).trim(), body: [] };
      continue;
    }
    if (mode === "abstract") abstract.push(line);
    else if (sub) sub.body.push(line);
    else intro.push(line);
  }
  flush();
  return { abstractHeading, abstract: abstract.join("\n").trim(), content };
}

// ─── Citations ──────────────────────────────────────────────────────────────

export type CiteKind = "lean" | "lit";

/** Where each citation of a reference sits in the article, in reading
 *  order - the reference lists' `^ a b` jump-back links. */
export type CitationOccurrences = Map<string, string[]>;

export const citeKey = (kind: CiteKind, n: number) => `${kind}-${n}`;
export const referenceId = (kind: CiteKind, n: number) => `apimap-ref-${kind}-${n}`;

/**
 * Rewrites the map's citation syntax into markdown links the article's
 * renderer picks out by their `#cite-…` href: `[n]` (Lean), `{n}`
 * (literature) and `[TODO]` (not yet formalized), set flush against the
 * text they cite, as footnote marks are (the source puts a space or line
 * break before each; never a blank line). Each citation gets a unique
 * occurrence id, recorded in `occurrences` so the reference lists can link
 * back to it. Code spans are left alone.
 */
export function linkCitations(
  markdown: string,
  occurrences: CitationOccurrences,
  idPrefix: string,
): string {
  const record = (kind: CiteKind, n: number) => {
    const key = citeKey(kind, n);
    const list = occurrences.get(key) ?? [];
    const id = `${idPrefix}-${key}-${list.length}`;
    list.push(id);
    occurrences.set(key, list);
    return `[${n}](#cite-${kind}-${n}-${id})`;
  };
  return markdown
    .split(/(`[^`\n]*`)/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part
            .replace(/[ \t]*(?:\n[ \t]*)?\[(TODO|\d+(?:\s*,\s*\d+)*)\](?!\()/g, (_, inner: string) =>
              inner === "TODO"
                ? "[TODO](#cite-todo)"
                : inner
                    .split(",")
                    .map((n) => record("lean", Number(n.trim())))
                    .join(""),
            )
            .replace(/[ \t]*(?:\n[ \t]*)?\{\s*(\d+)\s*\}/g, (_, n: string) => record("lit", Number(n))),
    )
    .join("");
}

/** Parses a `#cite-…` href back into what it cites. */
export function parseCiteHref(
  href: string,
): { kind: CiteKind; n: number; id: string } | { kind: "todo" } | null {
  if (href === "#cite-todo") return { kind: "todo" };
  const m = href.match(/^#cite-(lean|lit)-(\d+)-(.+)$/);
  return m ? { kind: m[1] as CiteKind, n: Number(m[2]), id: m[3] } : null;
}

export function findLeanReference(refs: ApiMapLeanReference[], n: number) {
  return refs.find((r) => r.index === n);
}

export function findReference(refs: ApiMapReference[], n: number) {
  return refs.find((r) => r.index === n);
}

/** `a`, `b`, …, `z`, `aa`, … - the jump-back labels of a reference cited
 *  more than once. */
export function backlinkLabel(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

// ─── Status ─────────────────────────────────────────────────────────────────

/**
 * Which parts of a map are Alpha. The abstract and the content are marked
 * separately (`## Abstract (Alpha)`, `## Content (Alpha)`), so a map can
 * have a reviewed abstract over Alpha content, or the reverse, or both
 * `## Content` and `## Content (Alpha)`.
 */
export type AlphaParts = {
  abstract: boolean;
  content: "all" | "some" | "none";
  /** Any part is Alpha. */
  any: boolean;
  /** Some parts are Alpha and others aren't - then each Alpha part is
   *  marked where it appears. */
  mixed: boolean;
};

export function alphaParts(node: ApiMapNode): AlphaParts {
  const alphaSections = node.content.filter((c) => c.alpha).length;
  const content: AlphaParts["content"] =
    node.content.length === 0
      ? node.alpha
        ? "all"
        : "none"
      : alphaSections === node.content.length
        ? "all"
        : alphaSections > 0
          ? "some"
          : "none";
  const any = node.alpha || content !== "none";
  return { abstract: node.alpha, content, any, mixed: any && !(node.alpha && content === "all") };
}

export function claimCounts(node: ApiMapNode) {
  return {
    done: node.requirements.filter((r) => r.done).length,
    total: node.requirements.length,
  };
}

// ─── Diff ───────────────────────────────────────────────────────────────────

export type DiffLine = { op: " " | "-" | "+"; text: string };

/** A line diff (longest common subsequence). Sections are at most a few
 *  hundred lines, so the quadratic table is fine. */
export function lineDiff(before: string, after: string): DiffLine[] {
  // An empty text is no lines, not one blank one - so a new section diffs
  // as all additions.
  const a = before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ op: " ", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) out.push({ op: "-", text: a[i++] });
    else out.push({ op: "+", text: b[j++] });
  }
  while (i < a.length) out.push({ op: "-", text: a[i++] });
  while (j < b.length) out.push({ op: "+", text: b[j++] });
  return out;
}

/** The changed lines with `context` unchanged lines around each run, gaps
 *  between runs marked by a `null`. */
export function diffHunks(diff: DiffLine[], context = 2): (DiffLine | null)[] {
  const keep = diff.map(() => false);
  diff.forEach((d, i) => {
    if (d.op === " ") return;
    for (let k = Math.max(0, i - context); k <= Math.min(diff.length - 1, i + context); k++)
      keep[k] = true;
  });
  const out: (DiffLine | null)[] = [];
  diff.forEach((d, i) => {
    if (keep[i]) out.push(d);
    else if (out.length && out[out.length - 1] !== null) out.push(null);
  });
  if (out[out.length - 1] === null) out.pop();
  return out;
}

export function unifiedDiff(diff: DiffLine[]): string {
  return diffHunks(diff)
    .map((d) => (d === null ? "@@" : `${d.op}${d.text}`))
    .join("\n");
}

// ─── New API maps ───────────────────────────────────────────────────────────

/** The skeleton of a new API-map.md, in the shape docs/API_MAP_GUIDE.md asks
 *  for. */
export function newApiMapTemplate(title: string, abstract = ""): string {
  return [
    `# ${title.trim() || "Title of the API"}`,
    "",
    "## Abstract (Alpha)",
    "",
    abstract.trim() ||
      "One paragraph saying what this area of physics is about and what the API covers. No citations here.",
    "",
    "## Content (Alpha)",
    "",
    "### First concept",
    "",
    "State each concept as you would explain it to a colleague, then cite the Lean declaration that",
    "formalizes it. [1] Something not yet in Lean is marked as such. [TODO] Literature is cited with",
    "curly brackets. {1}",
    "",
    "## Lean References",
    "",
    "1. Physlib/Path/To/File.lean — `declarationName`, `anotherDeclaration`",
    "",
    "## References",
    "",
    "1. Author, *Title of book or paper*, chapter or section.",
    "",
  ].join("\n");
}

/** A numbered markdown list, wrapped lines joined onto their entry. */
function numberedEntries(text: string): { index: number; text: string }[] {
  const entries: { index: number; text: string }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(\d+)\.\s+(.*)$/);
    if (m) entries.push({ index: Number(m[1]), text: m[2] });
    else if (entries.length) entries[entries.length - 1].text += " " + line;
  }
  return entries;
}

/**
 * Reads a whole API-map.md as the reader writes it on the create page, for
 * the preview: the same shape the generator produces, with declarations
 * left unresolved (they aren't in Physlib yet, or not at that path).
 */
export function parseFullApiMap(text: string) {
  const lines = text.split("\n");
  const titleLine = lines.find((l) => /^# /.test(l));
  const at = (heading: string) => lines.findIndex((l) => l.trim() === `## ${heading}`);
  const leanAt = at("Lean References");
  const litAt = at("References");
  const bodyEnd = [leanAt, litAt].filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? lines.length;
  const slice = (from: number) => {
    if (from < 0) return "";
    const next = lines.findIndex((l, i) => i > from && /^## /.test(l));
    return lines.slice(from + 1, next < 0 ? lines.length : next).join("\n");
  };
  const article = parseArticleSource(
    lines
      .slice(0, bodyEnd)
      .filter((l) => !/^# /.test(l))
      .join("\n"),
  );
  return {
    title: titleLine ? titleLine.slice(2).trim() : "",
    ...article,
    leanReferences: numberedEntries(slice(leanAt)).map(({ index, text }) => {
      const dash = text.indexOf("—");
      return {
        index,
        file: (dash >= 0 ? text.slice(0, dash) : text).trim(),
        exists: true,
        declarations: [...(dash >= 0 ? text.slice(dash + 1) : "").matchAll(/`([^`]+)`/g)].map(
          (m) => ({ text: m[1].trim() }),
        ),
      };
    }),
    references: numberedEntries(slice(litAt)).map(({ index, text }) => {
      const m = text.match(/((?:Physlib|PhyslibAlpha|QuantumInfo)\/[^\s,;)]*?)\/API-map\.md/);
      return { index, text, apiMap: m ? m[1] : null };
    }),
  };
}
