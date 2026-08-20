/**
 * Selects an API-map entry by path via the URL hash, without the browser's
 * native hash-navigation jump: assigning `location.hash` (or a plain
 * `<a href="#...">` click) always scrolls to the matching element, but
 * `history.pushState` never does. It also doesn't fire `hashchange`, so this
 * dispatches one manually - existing `hashchange` listeners (sidebar active
 * state, flowchart highlight) still react to it exactly as if the hash had
 * changed normally; only the automatic vertical scroll is suppressed. Each
 * listener decides its own scroll behavior from there (see api-flowchart.tsx,
 * which scrolls horizontally into view but not vertically).
 */
export function selectApiMapEntry(path: string): void {
  history.pushState(null, "", `#${path}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
