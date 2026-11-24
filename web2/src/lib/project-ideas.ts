import { getFindTasks, textPreview, type FindTask } from "@/lib/find-tasks";
import { getApiMap } from "@/lib/yaml";

/**
 * Project ideas are generated, never written by hand. An idea is a physics
 * topic whose API map still has claims that are not formalized: the map says
 * what the topic should contain, and the unformalized claims are the project.
 * Everything shown comes from data the site already refreshes on a schedule
 * (data/APIMap.json and the open GitHub issues), so an idea
 * updates as work lands and disappears once its map is fully formalized.
 */
export type ProjectIdea = {
  /** The API map's directory, e.g. "Physlib/QuantumMechanics/Qubit". */
  path: string;
  title: string;
  /** Top-level subject, e.g. "Quantum Mechanics". */
  area: string;
  summary: string;
  claims: number;
  formalized: number;
};

/** A part of the library with Lean files and no API map, so no roadmap. */
export type UnmappedArea = {
  path: string;
  title: string;
  area: string;
  leanFiles: number;
};

export type ProjectIdeaGroup = {
  key: "small" | "medium" | "large";
  label: string;
  total: number;
  ideas: ProjectIdea[];
};

/** Issues a maintainer has marked as a project, with the `project-idea` label. */
/** Smaller directories are usually part of a neighbouring topic. */
export const MIN_LEAN_FILES = 5;

const projectLabel = /^project[- ]ideas?$/i;

function areaOf(path: string): string {
  const [library, subject] = path.split("/");
  const name = library === "QuantumInfo" ? "Quantum Information" : subject ?? library;
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

function firstSentence(text: string): string {
  const plain = textPreview(text, 400);
  const end = plain.search(/[.!?](\s|$)/);
  return end === -1 ? plain : plain.slice(0, end + 1);
}

export async function getProjectIdeas(): Promise<{
  groups: ProjectIdeaGroup[];
  proposed: FindTask[];
  /** Every topic with claims left, shown or not. */
  total: number;
  roadmapCount: number;
  unmapped: UnmappedArea[];
  /** Open issues with the "good first issue" label; these stay on Find a Task. */
  goodFirstIssues: number;
}> {
  const [apiMap, { tasks }] = await Promise.all([getApiMap(), getFindTasks()]);

  const ideas: ProjectIdea[] = apiMap.nodes
    .map((node) => ({
      path: node.path,
      title: node.title,
      area: areaOf(node.path),
      summary: firstSentence(node.abstract),
      claims: node.requirements.length,
      formalized: node.requirements.filter((requirement) => requirement.done).length,
    }))
    .filter((idea) => idea.claims > idea.formalized)
    // Nearest to finished first, so the easiest projects lead each group.
    .sort((a, b) => a.claims - a.formalized - (b.claims - b.formalized) || a.title.localeCompare(b.title));

  const left = (idea: ProjectIdea) => idea.claims - idea.formalized;
  const pick = (key: ProjectIdeaGroup["key"], label: string, matches: ProjectIdea[]): ProjectIdeaGroup => ({
    key,
    label,
    total: matches.length,
    ideas: matches,
  });
  const groups: ProjectIdeaGroup[] = [
    pick("small", "1 to 3 claims left", ideas.filter((idea) => left(idea) <= 3)),
    pick("medium", "4 to 9 claims left", ideas.filter((idea) => left(idea) > 3 && left(idea) < 10)),
    // The biggest gaps first, so topics with nothing formalized yet lead.
    pick("large", "10 or more claims left", ideas.filter((idea) => left(idea) >= 10).reverse()),
  ];

  // Areas with Lean files that no API map covers: neither the directory, a
  // parent nor a child has one. Support code is left out, as it is not a
  // physics topic. Only the outermost such directory of each area is listed.
  const mapped = apiMap.directories.filter((directory) => directory.hasApiMap).map((directory) => directory.path);
  const within = (inner: string, outer: string) => inner === outer || inner.startsWith(`${outer}/`);
  const candidates = apiMap.directories.filter(
    ({ path, hasApiMap, leanFiles }) =>
      !hasApiMap &&
      leanFiles >= MIN_LEAN_FILES &&
      (path === "QuantumInfo" || path.startsWith("Physlib/")) &&
      !/(^|\/)(Meta|Mathematics)(\/|$)/.test(path) &&
      !mapped.some((map) => within(path, map) || within(map, path)),
  );
  const unmapped: UnmappedArea[] = candidates
    .filter(({ path }) => !candidates.some((other) => other.path !== path && within(path, other.path)))
    .map(({ path, leanFiles }) => ({
      path,
      title: (path.split("/").pop() ?? path).replace(/([a-z0-9])([A-Z])/g, "$1 $2"),
      area: areaOf(path),
      leanFiles,
    }))
    .sort((a, b) => b.leanFiles - a.leanFiles);

  return {
    groups: groups.filter((group) => group.ideas.length > 0),
    proposed: tasks.filter((task) => task.labels?.some((label) => projectLabel.test(label))),
    unmapped,
    goodFirstIssues: tasks.filter((task) => task.labels?.some((label) => /^good first issue$/i.test(label))).length,
    total: ideas.length,
    roadmapCount: apiMap.nodes.length,
  };
}
