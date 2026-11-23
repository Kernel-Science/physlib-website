"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraphvizView, loadImportGraphDot } from "@/components/graphviz-view";
import { DependencySubjectOverview } from "@/components/dependency-subject-overview";
import { filterDot, moduleNames, ROOT_MODULE, SPACE_MODULE, subjectSummary } from "@/lib/dependency-graph.mjs";
import { expandSubjectDot } from "@/lib/subject-module-graph.mjs";

type Selection = { sources: string[]; targets: string[] };

const defaultSelection: Selection = { sources: [], targets: [ROOT_MODULE] };
const spaceSelection: Selection = { sources: [SPACE_MODULE], targets: [ROOT_MODULE] };

// An edge "A" -> "B" in my_graph.dot means "A is imported by B". So walking
// edges forwards from a module finds everything that builds on it, and
// walking them backwards finds everything it needs.
const premadeViews: { label: string; selection: Selection }[] = [
  {
    label: "Everything",
    selection: defaultSelection,
  },
  {
    label: "Everything Built on Space",
    selection: spaceSelection,
  },
  {
    label: "Proof of Wick's Theorem",
    selection: {
      sources: [
        "Physlib.SpaceAndTime.SpaceTime.Basic",
        "Physlib.Mathematics.List.InsertIdx",
        "Physlib.Mathematics.Fin",
        "Physlib.QFT.PerturbationTheory.CreateAnnihilate",
      ],
      targets: ["Physlib.QFT.PerturbationTheory.WickAlgebra.WicksTheorem"],
    },
  },
  {
    label: "1D Quantum Harmonic Oscillator",
    selection: {
      sources: [],
      targets: ["Physlib.QuantumMechanics.HarmonicOscillator.OneDimension.TISE"],
    },
  },
];

function parseUrlParam(param: string | null, fallback: string[]): string[] {
  if (param === null) return fallback;
  return param.split(",").map((name) => name.trim()).filter(Boolean);
}

function readSelectionFromUrl(): Selection {
  const params = new URLSearchParams(window.location.search);
  return {
    sources: parseUrlParam(params.get("sources"), defaultSelection.sources),
    targets: parseUrlParam(params.get("targets"), defaultSelection.targets),
  };
}

// A shared link restores the preset, expanded subject and selected module.
function selectionHref({ sources, targets }: Selection, subject: string | null = null, module: string | null = null): string {
  const list = (names: string[]) => names.map(encodeURIComponent).join(",");
  const base = `/dependencies?sources=${list(sources)}&targets=${list(targets)}`;
  return base + (subject ? "&subject=" + encodeURIComponent(subject) : "")
    + (module ? "&module=" + encodeURIComponent(module) : "");
}

function sameSelection(a: Selection, b: Selection): boolean {
  const key = (names: string[]) => [...names].sort().join(",");
  return key(a.sources) === key(b.sources) && key(a.targets) === key(b.targets);
}

function shortName(name: string) {
  return name === ROOT_MODULE ? name : name.replace(/^Physlib\./, "");
}

function nameList(names: string[]) {
  const shown = names.slice(0, 2).map(shortName).join(", ");
  return names.length > 2 ? `${shown} and ${names.length - 2} more` : shown;
}

function describeSelection({ sources, targets }: Selection): string {
  const allTargets = targets.length === 0 || (targets.length === 1 && targets[0] === ROOT_MODULE);
  if (sources.length === 0 && allTargets) return "Every module in Physlib";
  if (sources.length === 0) return `Everything needed by ${nameList(targets)}`;
  if (allTargets) return `Everything built on ${nameList(sources)}`;
  return `Everything between ${nameList(sources)} and ${nameList(targets)}`;
}

export function DependenciesClient() {
  const [rawDot, setRawDot] = useState<string | null>(null);
  const nodes = useMemo(() => rawDot === null ? null : moduleNames(rawDot).sort(), [rawDot]);
  const [loadFailed, setLoadFailed] = useState(false);
  // What the graph is showing (null until the URL has been read on mount).
  const [applied, setApplied] = useState<Selection | null>(null);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const isEverything = applied !== null && sameSelection(applied, defaultSelection);
  const isSpace = applied !== null && sameSelection(applied, spaceSelection);
  const slice = useMemo(() => rawDot && applied
    ? filterDot(rawDot, applied.sources, applied.targets) : null, [rawDot, applied]);
  const visible = useMemo(() => slice ? moduleNames(slice) : [], [slice]);
  const includeRoot = expandedName === ROOT_MODULE || (visible.length === 1 && visible[0] === ROOT_MODULE);
  const subjects = useMemo(() => slice ? subjectSummary(slice, visible, includeRoot) : [], [slice, visible, includeRoot]);
  const expanded = subjects.find((s) => s.name === expandedName);
  const target = applied?.targets.find((name) => name !== ROOT_MODULE)?.split(".")[1];
  const initialFocus = isSpace ? "SpaceAndTime" : target ?? "QuantumMechanics";
  const focusName = expanded?.name ?? subjects.find((s) => s.name === initialFocus)?.name ?? subjects[0]?.name;
  // What the pickers below have ticked; becomes `applied` on "Render Graph".
  const [draft, setDraft] = useState<Selection>(defaultSelection);

  useEffect(() => {
    loadImportGraphDot()
      .then(setRawDot)
      .catch(() => setLoadFailed(true));

    const syncFromUrl = () => {
      const selection = readSelectionFromUrl();
      const params = new URLSearchParams(window.location.search);
      setApplied(selection);
      setDraft(selection);
      setExpandedName(params.get("subject"));
      setSelectedModule(params.get("module"));
    };
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const getDot = useMemo(() => {
    if (!slice) return null;
    return async () => expanded ? expandSubjectDot(slice, expanded.name) : slice;
  }, [slice, expanded]);

  const show = useCallback((selection: Selection) => {
    setApplied(selection);
    setDraft(selection);
    setExpandedName(null);
    setSelectedModule(null);
    const href = selectionHref(selection);
    if (window.location.pathname + window.location.search + window.location.hash !== href) {
      history.pushState(null, "", href);
    }
    document.getElementById("graph")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const selectSubject = useCallback((name: string | null, module: string | null = null) => {
    if (!applied) return;
    setExpandedName(name);
    setSelectedModule(module);
    // Keep the reader in the pane they used. Both panes update in place.
    const href = selectionHref(applied, name, module) + location.hash;
    if (location.pathname + location.search + location.hash !== href) {
      history.pushState(null, "", href);
    }
  }, [applied]);
  const selectModule = useCallback((name: string) => {
    selectSubject(name.split(".")[1] ?? ROOT_MODULE, name);
  }, [selectSubject]);

  const toggle = (side: keyof Selection, node: string) =>
    setDraft((prev) => ({
      ...prev,
      [side]: prev[side].includes(node)
        ? prev[side].filter((n) => n !== node)
        : [...prev[side], node],
    }));

  // A shared link can outlive the modules it names (files get moved and
  // renamed); say so instead of silently drawing an empty or partial graph.
  const missing = useMemo(() => {
    if (!nodes || !applied) return [];
    const known = new Set(nodes);
    return [...new Set([...applied.sources, ...applied.targets])].filter((n) => !known.has(n));
  }, [nodes, applied]);

  const dirty = applied !== null && !sameSelection(applied, draft);

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="graph">
        <h2 id="graph" className="text-xl font-semibold mb-2 scroll-mt-24">
          Dependency Graph
        </h2>
        <nav aria-label="Premade Views" className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted mr-1">Premade Views</span>
          {premadeViews.map(({ label, selection }) => {
            const active = applied !== null && sameSelection(applied, selection);
            return (
              <a
                key={label}
                href={selectionHref(selection)}
                aria-current={active ? "true" : undefined}
                onClick={(event) => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  show(selection);
                }}
                className={`rounded-(--radius) border px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:bg-surface-secondary hover:text-foreground"
                }`}
              >
                {label}
              </a>
            );
          })}
        </nav>
        {missing.length > 0 && (
          <p role="alert" className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            This link names {missing.length === 1 ? "a module" : "modules"} not in Physlib,
            so {missing.length === 1 ? "it was" : "they were"} ignored:{" "}
            <span className="font-mono text-xs break-all">{missing.join(", ")}</span>
          </p>
        )}
        {loadFailed ? (
          <p role="alert" className="text-sm text-muted">The dependency graph could not be loaded. Reload to try again.</p>
        ) : !rawDot || !applied ? (
          <p role="status" className="py-8 text-sm text-muted">Loading dependencies…</p>
        ) : (
          <>
            <div id="module-graph" className="@container scroll-mt-20">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-base font-semibold">
                  {expanded ? expanded.label : `${visible.length} ${visible.length === 1 ? "Module" : "Modules"}`}
                </h3>
                {expanded ? (
                  <button type="button" onClick={() => selectSubject(null)} className="text-sm text-accent hover:underline">
                    Show All {visible.length} Modules
                  </button>
                ) : focusName && (
                  <a href="#subject-dependencies" className="text-sm text-accent hover:underline">Subject Dependencies ↓</a>
                )}
              </div>
              <GraphvizView
                getDot={getDot}
                overview={(isEverything || isSpace) && !expanded}
                packedLayout
                fitAll
                selectedModule={selectedModule}
                onSelectModule={selectModule}
                onOpenSubject={selectSubject}
                height="clamp(14rem, 50cqw, min(65svh, 33rem))"
                label="Physlib module dependency graph"
              />
            </div>
            {focusName && (
              <div className="mt-6">
                <DependencySubjectOverview
                  subjects={subjects}
                  focusName={focusName}
                  onFocusSubject={selectSubject}
                />
              </div>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="custom-graph">
        <h2 id="custom-graph" className="text-xl font-semibold mb-2 scroll-mt-24">
          Customizer
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          Select sources and targets, then click Render Graph. An empty list
          means no restriction on that side. Selected modules are drawn with a
          double outline.
        </p>

        {loadFailed ? (
          <p role="alert" className="text-sm text-muted">
            The module list could not be loaded. Reload the page to try again.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <ModulePicker
                title="Sources"
                hint="Show what builds on these."
                nodes={nodes}
                selected={draft.sources}
                onToggle={(node) => toggle("sources", node)}
                onClear={() => setDraft((prev) => ({ ...prev, sources: [] }))}
                prefix="src"
              />
              <ModulePicker
                title="Targets"
                hint="Show what these need."
                nodes={nodes}
                selected={draft.targets}
                onToggle={(node) => toggle("targets", node)}
                onClear={() => setDraft((prev) => ({ ...prev, targets: [] }))}
                prefix="tgt"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => show(draft)}
                disabled={!dirty}
                className="rounded-(--radius) bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                Render Graph
              </button>
              <p className="text-sm text-muted" role="status">
                {dirty
                  ? `Will show: ${describeSelection(draft).replace(/^E/, "e")}.`
                  : ""}
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ModulePicker({
  title,
  hint,
  nodes,
  selected,
  onToggle,
  onClear,
  prefix,
}: {
  title: string;
  hint: string;
  nodes: string[] | null;
  selected: string[];
  onToggle: (n: string) => void;
  onClear: () => void;
  prefix: string;
}) {
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const visible = useMemo(
    () => (nodes ?? []).filter((node) => node.toLowerCase().includes(needle)),
    [nodes, needle],
  );
  const chosen = useMemo(() => new Set(selected), [selected]);

  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-baseline gap-2">
        <h3 className="font-medium">{title}</h3>
        <span className="text-xs text-muted tabular-nums">{selected.length} selected</span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto text-xs text-accent hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mb-2 text-xs text-muted">{hint}</p>
      {selected.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1">
          {selected.map((node) => (
            <li key={node}>
              <button
                type="button"
                onClick={() => onToggle(node)}
                title={`Remove ${node}`}
                className="max-w-full break-all rounded-(--radius) border border-border bg-surface px-2 py-0.5 text-left font-mono text-[11px] hover:border-accent hover:text-accent"
              >
                {shortName(node)} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="search"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter modules…"
        aria-label={`Filter ${title.toLowerCase()}`}
        className="site-field mb-2 w-full"
      />
      <div className="h-56 overflow-y-auto rounded-lg border border-border bg-surface p-2 font-mono text-xs space-y-1">
        {nodes === null ? (
          <p className="font-sans text-muted">Loading modules…</p>
        ) : visible.length === 0 ? (
          <p className="font-sans text-muted">No modules match “{filter.trim()}”.</p>
        ) : (
          visible.map((node) => (
            <label
              key={node}
              className="flex items-start gap-2 cursor-pointer break-all hover:text-accent"
            >
              <input
                type="checkbox"
                id={`${prefix}-${node}`}
                checked={chosen.has(node)}
                onChange={() => onToggle(node)}
                className="mt-0.5 accent-accent"
              />
              {node}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
