"use client";

import { useEffect, useState } from "react";
import { Card, Chip } from "@heroui/react";
import { CheckIcon, CopyIcon } from "@/components/monthly-updates/icons";
import { SuggestPromptEditDialog } from "@/components/prompts/suggest-prompt-dialog";
import { PREAMBLE } from "./preamble";

const FOLDER_STORAGE_KEY = "physlib-prompts-folder";
const SOURCE_STORAGE_KEY = "physlib-prompts-source";

type ChipColor = "accent" | "danger" | "default" | "success" | "warning";

type PromptDef = {
  id: string;
  title: string;
  category: string;
  chipColor: ChipColor;
  summary: string;
  template: (folder: string, source: string) => string;
};

// Appended by new-ideas/api-map when a source material path/URL is set -
// omitted entirely otherwise, rather than pointing the agent at nothing.
function sourceSentence(source: string): string {
  return source
    ? ` Use \`${source}\` as the source material to base this on.`
    : "";
}

const PROMPTS: PromptDef[] = [
  {
    id: "explain",
    title: "Explain",
    category: "Understand",
    chipColor: "accent",
    summary:
      "Get a natural-language walkthrough of what the code in a folder does, how its pieces fit together, and where to start readin.",
    template: (folder) =>
      `Explain \`${folder}\` to me: what physical or mathematical topic it covers, how its main definitions and theorems relate to each other, and how it fits into the rest of Physlib. Point me to the key files/declarations to start reading.`,
  },
  {
    id: "new-ideas",
    title: "New ideas",
    category: "Research",
    chipColor: "warning",
    summary:
      "Have the agent compare a folder against the standard textbook treatment of its topic and come back with a prioritized list of what's missing.",
    template: (folder, source) =>
      `Research \`${folder}\` and its existing API-map.md (if any) against the standard textbook/reference treatment of this topic.${sourceSentence(source)} Identify definitions, theorems, or edge cases that are missing and would be worth formalizing next, and explain why each one matters. Don't write any Lean code — just produce a prioritized list of suggestions.`,
  },
  {
    id: "physlib-alpha",
    title: "PhyslibAlpha",
    category: "Cleanup",
    chipColor: "danger",
    summary: "Improve any sections of code in PhyslibAlpha.",
    template: () =>
      `Search through /PhyslibAlpha. This is the staging ground for code which has been submitted without adhering to the rigorous quality standards of /Physlib. The code may be in the wrong subfolder location or proofs may be too long etc. Your job is to find a self contained piece of work from this folder, improve the code quality, and insert it into the correct place in /Physlib.`,
  },
  {
    id: "golf",
    title: "Golf",
    category: "Refactor",
    chipColor: "default",
    summary:
      "Shorten proofs that are longer than they need to be, without changing what they state — a good low-risk way to get familiar with a folder's style.",
    template: (folder) =>
      `Look at the proofs in \`${folder}\` and golf (shorten) any that are longer than necessary, without changing what they state. Preserve declaration names, types, and docstrings — only rewrite the proof term/tactic block. Run \`lake build\` afterwards to confirm nothing broke.`,
  },
  {
    id: "api-map",
    title: "APIMap",
    category: "Docs",
    chipColor: "accent",
    summary:
      "Create or refresh the API-map.md describing a folder's API, so the API tracker and dependency map stay accurate as the folder evolves.",
    template: (folder, source) =>
      `Look at \`${folder}\` and either create a new \`API-map.md\` or update the existing one, following docs/API_MAP_GUIDE.md: explain the physics of the API in prose, close each claim with a numbered citation of the Lean declarations that formalize it (or [TODO] if it is not formalized yet), and list those declarations under Lean References and the literature under References. Check the result with \`lake exe api_map_lint\`.${sourceSentence(source)}`,
  },
  {
    id: "todo",
    title: "TODO",
    category: "New Code",
    chipColor: "success",
    summary:
      "Pick up an existing TODO comment in a folder and turn it into a complete, sorry-free proof, rather than starting a formalization from scratch.",
    template: (folder) =>
      `Look through any TODO comments in \`${folder}\` and formalize one of them properly, with a complete, sorry-free proof.`,
  },
];

// Folders aren't tracked as their own data — derive them from the import
// graph's file-level node names (e.g. "Physlib.ClassicalMechanics.Basic")
// by taking every proper dotted prefix, which is exactly the directory path.
function deriveFolders(dotText: string): string[] {
  const nodeRegex = /"([^"]+)"\s*\[/g;
  const folders = new Set<string>(["Physlib"]);
  let m: RegExpExecArray | null;
  while ((m = nodeRegex.exec(dotText)) !== null) {
    const parts = m[1].split(".");
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }
  return Array.from(folders).sort();
}

export function PromptsClient() {
  const [folders, setFolders] = useState<string[]>(["Physlib"]);
  const [folder, setFolder] = useState("Physlib");
  const [source, setSource] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedSource = window.localStorage.getItem(SOURCE_STORAGE_KEY);
    if (storedSource) setSource(storedSource);

    fetch("/my_graph.dot")
      .then((r) => r.text())
      .then((text) => {
        const derived = deriveFolders(text);
        setFolders(derived);
        const stored = window.localStorage.getItem(FOLDER_STORAGE_KEY);
        if (stored && derived.includes(stored)) setFolder(stored);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  function handleFolderChange(next: string) {
    setFolder(next);
    window.localStorage.setItem(FOLDER_STORAGE_KEY, next);
  }

  function handleSourceChange(next: string) {
    setSource(next);
    window.localStorage.setItem(SOURCE_STORAGE_KEY, next);
  }

  return (
    <div>
      <div className="mb-10 grid gap-5 rounded-xl border border-border bg-surface-secondary/40 p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <label
            htmlFor="prompts-folder"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted/80"
          >
            Working folder
          </label>
          <select
            id="prompts-folder"
            value={folder}
            disabled={!ready}
            onChange={(e) => handleFolderChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            Choose a folder to autofill the prompts below.
          </p>
        </div>

        <div>
          <label
            htmlFor="prompts-source"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted/80"
          >
            Research source material (optional)
          </label>
          <input
            id="prompts-source"
            type="text"
            value={source}
            onChange={(e) => handleSourceChange(e.target.value)}
            placeholder="URL or file path, e.g. a textbook chapter or paper"
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none"
          />
          <p className="mt-2 text-xs text-muted">
            Used when additional context can help the agent complete the task.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROMPTS.map((prompt) => (
          <PromptCard key={prompt.id} prompt={prompt} folder={folder} source={source} />
        ))}
      </div>
    </div>
  );
}

function PromptCard({
  prompt,
  folder,
  source,
}: {
  prompt: PromptDef;
  folder: string;
  source: string;
}) {
  const [copied, setCopied] = useState<"prompt" | "preamble" | null>(null);
  const text = prompt.template(folder, source);

  async function onCopy(variant: "prompt" | "preamble") {
    try {
      await navigator.clipboard.writeText(variant === "preamble" ? PREAMBLE + text : text);
      setCopied(variant);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard API can reject in insecure contexts or without permission;
      // the text is still visible and selectable below, so no-op.
    }
  }

  return (
    <Card variant="default" className="flex h-full flex-col">
      <Card.Header className="flex flex-row items-start justify-between gap-3">
        <Card.Title>{prompt.title}</Card.Title>
        <Chip color={prompt.chipColor} variant="soft" size="sm" className="shrink-0 text-xs">
          {prompt.category}
        </Chip>
      </Card.Header>
      <Card.Content className="flex flex-1 flex-col text-sm text-foreground/90">
        <p className="mb-3 leading-relaxed text-muted">{prompt.summary}</p>
        <p className="mb-3 max-h-64 select-text overflow-y-auto rounded-lg border border-border bg-surface-secondary/40 p-2.5 text-xs leading-relaxed text-foreground/90">
          {text}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onCopy("prompt")}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-accent"
          >
            {copied === "prompt" ? (
              <>
                <CheckIcon className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" />
                Copy prompt
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onCopy("preamble")}
            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-accent"
          >
            {copied === "preamble" ? (
              <>
                <CheckIcon className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" />
                Copy with preamble
              </>
            )}
          </button>
          <SuggestPromptEditDialog
            promptId={prompt.id}
            promptTitle={prompt.title}
            currentText={text}
          />
        </div>
      </Card.Content>
    </Card>
  );
}
