/**
 * Tracks the References page's current view (and, within a view, an
 * optional selected group) in the URL hash - the same trick api-map-hash.ts
 * uses, and for the same reason: the sidebar and the page content mount in
 * separate parts of the component tree (see ConditionalSidebar) and have no
 * other shared state to coordinate through. The sidebar reads the view to
 * decide which list (subfolders vs. authors) to show at all, and reads the
 * group to highlight the active entry.
 *
 * `history.pushState` (unlike assigning `location.hash`) doesn't trigger the
 * browser's native scroll-to-anchor or fire `hashchange`, so we dispatch
 * `hashchange` manually and let each side react to it itself.
 */
export type ReferencesSelection =
  | { view: "cited" }
  | { view: "subfolder"; subfolder?: string }
  | { view: "author"; letter?: string };

export function decodeReferencesHash(): ReferencesSelection {
  const raw = window.location.hash.replace(/^#/, "");
  if (raw.startsWith("subfolder")) {
    const rest = raw.slice("subfolder".length);
    return rest.startsWith(":")
      ? { view: "subfolder", subfolder: decodeURIComponent(rest.slice(1)) }
      : { view: "subfolder" };
  }
  if (raw.startsWith("author")) {
    const rest = raw.slice("author".length);
    return rest.startsWith(":")
      ? { view: "author", letter: decodeURIComponent(rest.slice(1)) }
      : { view: "author" };
  }
  return { view: "cited" };
}

export function setReferencesHash(selection: ReferencesSelection): void {
  let value: string;
  if (selection.view === "cited") {
    value = "cited";
  } else if (selection.view === "subfolder") {
    value = selection.subfolder ? `subfolder:${encodeURIComponent(selection.subfolder)}` : "subfolder";
  } else {
    value = selection.letter ? `author:${encodeURIComponent(selection.letter)}` : "author";
  }
  history.pushState(null, "", `#${value}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
