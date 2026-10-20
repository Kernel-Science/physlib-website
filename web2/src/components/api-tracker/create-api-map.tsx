"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiMap } from "@/lib/yaml";
import { apiMapHref, newApiMapTemplate, parseFullApiMap } from "@/lib/api-map-article";
import { MAX_URL_LENGTH } from "@/components/suggest-dialog-shared";
import { ArticleContext, type ArticleContextValue } from "@/components/api-tracker/article-prose";
import { Callout } from "@/components/api-tracker/article-view";
import { ArticleEditor } from "@/components/api-tracker/article-editor";
import { apiMapIssue, type IssueDraft } from "@/lib/api-map-issue";

/**
 * Starting a new API map. A short guide to writing one comes first, then
 * where the map will live
 * (a folder of Physlib that has no map yet, or an area Physlib doesn't cover
 * at all), then the source editor with a skeleton map to fill in.
 * Publishing files a GitHub issue with the finished file; GitHub's new-file
 * editor is offered for those who would rather open a pull request.
 */

const GUIDE_URL =
  "https://github.com/leanprover-community/physlib/blob/master/docs/API_MAP_GUIDE.md";
const ROOTS = ["Physlib", "PhyslibAlpha", "QuantumInfo"];

function WritingGuide({ examplePath }: { examplePath: string | null }) {
  return (
    <section className="apimap-guide" aria-labelledby="apimap-guide-title">
      <h2 id="apimap-guide-title" className="apimap-guide-title">
        How to write an API map
      </h2>
      <p>
        An API map is a short article about one area of physics in Physlib.
        It explains the physics in words, and points from each statement to
        the Lean declarations that formalize it.
      </p>
      <ol>
        <li>
          <b>One file per API.</b> It is called <code className="apimap-code">API-map.md</code>{" "}
          and sits in the top folder of the API it describes.
        </li>
        <li>
          <b>Fixed headings.</b> A <code className="apimap-code"># Title</code>, then{" "}
          <code className="apimap-code">## Abstract (Alpha)</code> (one paragraph, no citations),{" "}
          <code className="apimap-code">## Content (Alpha)</code> (prose, split by{" "}
          <code className="apimap-code">###</code> subsections),{" "}
          <code className="apimap-code">## Lean References</code> and{" "}
          <code className="apimap-code">## References</code>.
        </li>
        <li>
          <b>Content first.</b> State the physics as you would to a colleague
          who does not know the Lean names. End each claim with a Lean citation
          such as <code className="apimap-code">[1]</code>, one number per bracket. If it
          is not formalized yet, write <code className="apimap-code">[TODO]</code>, so the
          map doubles as a roadmap.
        </li>
        <li>
          <b>Lean references.</b> Number them from 1 and cite each one. An entry is
          the file and its declarations, e.g.{" "}
          <code className="apimap-code">1. Physlib/SpaceAndTime/Time/Basic.lean — `Time`, `Time.val`</code>.
        </li>
        <li>
          <b>Literature and other API maps</b> go under References and are
          cited with curly brackets, <code className="apimap-code">{"{1}"}</code>. Don&apos;t
          put links in the text itself.
        </li>
        <li>
          <b>New maps start as Alpha.</b>{" "}
          They become reviewed maps after Physlib&apos;s full review.
        </li>
      </ol>
      <p className="mt-2">
        <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer" className="apimap-external">
          Read the full guide
        </a>
        {examplePath && (
          <>
            {" "}
            or{" "}
            <a href={apiMapHref(examplePath)} className="apimap-link">
              see an example
            </a>
          </>
        )}
        . Before opening a pull request, check the file with{" "}
        <code className="apimap-code">lake exe api_map_lint</code>.
      </p>
    </section>
  );
}

type Where = "existing" | "new";

function newFileUrl(repo: string, branch: string, path: string, text: string): string {
  const base = `https://github.com/${repo}/new/${branch}?filename=${encodeURIComponent(`${path}/API-map.md`)}`;
  const full = `${base}&value=${encodeURIComponent(text)}`;
  return full.length <= MAX_URL_LENGTH ? full : base;
}

export function CreateApiMap({ apiMap }: { apiMap: ApiMap }) {
  const { repo, branch, nodes, directories } = apiMap;
  const byPath = useMemo(() => new Map(nodes.map((n) => [n.path, n])), [nodes]);
  const dirPaths = useMemo(() => new Set(directories.map((d) => d.path)), [directories]);
  const mapped = useMemo(
    () => new Set([...nodes.map((n) => n.path), ...directories.filter((d) => d.hasApiMap).map((d) => d.path)]),
    [nodes, directories],
  );

  const [where, setWhere] = useState<Where>("existing");
  const [existingPath, setExistingPath] = useState("");
  const [newPath, setNewPath] = useState("");
  const [filter, setFilter] = useState("");
  const [seed, setSeed] = useState<{ title: string; key: number }>({ title: "", key: 0 });
  const [text, setText] = useState(() => newApiMapTemplate(""));

  // A red link arrives with ?path=…&title=…; read once on the client, which
  // keeps this page static.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = (params.get("path") ?? "").replace(/^\/+|\/+$/g, "");
    const title = params.get("title") ?? "";
    if (path) {
      if (dirPaths.has(path)) {
        setWhere("existing");
        setExistingPath(path);
        setFilter(path);
      } else {
        setWhere("new");
        setNewPath(path);
      }
    }
    if (title) {
      setSeed((s) => ({ title, key: s.key + 1 }));
      setText(newApiMapTemplate(title));
    }
  }, [dirPaths]);

  const path = (where === "existing" ? existingPath : newPath).trim().replace(/^\/+|\/+$/g, "");

  const pathProblem = (() => {
    if (!path) return where === "existing" ? "Choose a folder for the API map." : "Give the folder for the new area.";
    if (!ROOTS.includes(path.split("/")[0]))
      return `The folder must be inside ${ROOTS.join(", ")}.`;
    if (!/^[\w./-]+$/u.test(path) || path.includes("//")) return "The folder path can only contain letters, digits, _, - and /.";
    if (mapped.has(path)) return "That folder already has an API map - edit it instead.";
    if (where === "new" && dirPaths.has(path)) return "That folder already exists in Physlib - choose it under “In an existing part of Physlib”.";
    return null;
  })();

  const candidates = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return directories
      .filter((d) => !q || d.path.toLowerCase().includes(q))
      .slice(0, 200);
  }, [directories, filter]);

  const context: ArticleContextValue = useMemo(
    () => ({ repo, branch, leanReferences: [], references: [], byPath }),
    [repo, branch, byPath],
  );

  const issue: IssueDraft = apiMapIssue({
    title: `API-map: new API map — ${parseFullApiMap(text).title || "untitled"}`,
    heading: "New API map",
    facts: [
      `**Title:** ${parseFullApiMap(text).title || "_untitled_"}`,
      `**Location:** \`${path}/API-map.md\``,
      `**Area:** ${where === "existing" ? "an existing folder of Physlib" : "a new area, not yet in Physlib"}`,
    ],
    file: `${path}/API-map.md`,
    commit: apiMap.commit,
    operation: { op: "create-file" },
    base: null,
  });

  const validate = (file: string) => {
    if (pathProblem) return pathProblem;
    const parsed = parseFullApiMap(file);
    if (!parsed.title || parsed.title === "Title of the API") return "Give the API map a title on its first line (# Title).";
    if (!parsed.abstract || /^One paragraph saying/.test(parsed.abstract)) return "Write the abstract.";
    return null;
  };

  const option = (value: Where, title: string, text: string) => (
    <label className={`apimap-choice ${where === value ? "apimap-choice-active" : ""}`}>
      <input
        type="radio"
        name="where"
        value={value}
        checked={where === value}
        onChange={() => setWhere(value)}
        className="mt-1 accent-[var(--accent)]"
      />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted">{text}</span>
      </span>
    </label>
  );

  return (
    <ArticleContext.Provider value={context}>
      <div className="apimap">
        <a href="/api-tracker" className="mb-2 inline-block text-xs text-muted hover:text-accent">
          ← API maps
        </a>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Create an API map</h1>
        <p className="mb-6 leading-relaxed text-muted">
          Start the API map for an area of Physlib that doesn&apos;t have one,
          or for physics that Physlib doesn&apos;t cover yet.
        </p>

        <WritingGuide examplePath={byPath.has("Physlib/SpaceAndTime/Time") ? "Physlib/SpaceAndTime/Time" : nodes[0]?.path ?? null} />

        <h2 className="apimap-h2">
          <span>1. Where will it live?</span>
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {option("existing", "In an existing part of Physlib", "A folder that already has Lean files but no API map yet.")}
          {option("new", "In a new area", "Physics that Physlib does not cover yet - the map can start as a roadmap of [TODO]s.")}
        </div>

        {where === "existing" ? (
          <div className="mt-3">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search folders, e.g. Electromagnetism"
              aria-label="Search folders"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/60 focus:border-accent"
            />
            <ul className="apimap-dirlist" role="listbox" aria-label="Folders">
              {candidates.map((d) => {
                const has = mapped.has(d.path);
                const selected = existingPath === d.path;
                return (
                  <li key={d.path}>
                    {has ? (
                      <a href={apiMapHref(d.path)} className="apimap-dir apimap-dir-mapped" title="Already has an API map">
                        <span className="truncate font-mono">{d.path}</span>
                        <span className="shrink-0 text-[11px]">has a map →</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => setExistingPath(d.path)}
                        className={`apimap-dir ${selected ? "apimap-dir-selected" : ""}`}
                      >
                        <span className="truncate font-mono">{d.path}</span>
                        <span className="shrink-0 text-[11px] text-muted">
                          {d.leanFiles} Lean file{d.leanFiles === 1 ? "" : "s"}
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
              {candidates.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">
                  No folder matches. If the area is not in Physlib yet, choose “In a new area”.
                </li>
              )}
            </ul>
          </div>
        ) : (
          <label className="mt-3 block">
            <span className="text-sm font-medium">Folder of the new area</span>
            <input
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="e.g. Physlib/Optics/GeometricOptics"
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm outline-none placeholder:text-muted/60 focus:border-accent"
            />
            <span className="mt-1 block text-xs text-muted">
              Choose where it fits among Physlib&apos;s existing top-level folders, so the Lean files can follow later.
            </span>
          </label>
        )}

        <p className={`mt-2 text-sm ${pathProblem ? "text-muted" : "text-success"}`}>
          {pathProblem ?? (
            <>
              The map will be created at <code className="apimap-code">{path}/API-map.md</code>.
            </>
          )}
        </p>

        <h2 className="apimap-h2">
          <span>2. Write it</span>
        </h2>
        <ArticleEditor
          key={seed.key}
          notice={
            <Callout>
              The text box starts with a skeleton map: replace the placeholder
              text and keep the headings. <b>Preview</b> shows the page as
              readers will see it.
            </Callout>
          }
          initial={newApiMapTemplate(seed.title)}
          shape="file"
          context={context}
          repo={repo}
          issue={issue}
          validate={validate}
          onTextChange={setText}
          footer={
            <>
              Comfortable with Git?{" "}
              <a
                href={pathProblem ? undefined : newFileUrl(repo, branch, path, text)}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!!pathProblem}
                className={pathProblem ? "text-muted" : "apimap-external"}
              >
                Create the file on GitHub
              </a>{" "}
              to open a pull request directly{pathProblem ? " (choose a folder first)" : ""}.
            </>
          }
        />
      </div>
    </ArticleContext.Provider>
  );
}
