import type { Reference } from "./yaml";

/**
 * Shared grouping rules for the References page, used by both the page
 * content (references-client.tsx) and its sidebar (references-sidebar.tsx) -
 * those two mount in separate parts of the component tree (see
 * ConditionalSidebar) and coordinate purely via the URL hash, so they need
 * to agree on exactly the same grouping to avoid the sidebar linking to a
 * group the content never renders.
 */

export function authorLetterOf(ref: Reference): string {
  if (ref.authors.length === 0) return "#";
  const letter = ref.authorSortKey[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(letter) ? letter : "#";
}

export function subfoldersOf(ref: Reference): string[] {
  return [...new Set(ref.citations.map((c) => c.subfolder))];
}

export function allSubfolders(references: Reference[]): string[] {
  const set = new Set<string>();
  for (const ref of references) for (const s of subfoldersOf(ref)) set.add(s);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function allAuthorLetters(references: Reference[]): string[] {
  const set = new Set<string>();
  for (const ref of references) set.add(authorLetterOf(ref));
  return [...set].sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)));
}

export function subfolderGroupKey(subfolder: string): string {
  return `subfolder:${subfolder}`;
}

export function authorGroupKey(letter: string): string {
  return `author:${letter}`;
}
