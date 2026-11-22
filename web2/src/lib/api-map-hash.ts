export function scrollToApiMapArticle(): void {
  document.getElementById("api-map-article")?.scrollIntoView({
    block: "start",
    inline: "nearest",
    behavior: "instant",
  });
}

/** Select the map without navigating to a native fragment target. The sidebar
 * brings the article into view, while a selection in the dependency graph can
 * retain the graph's own scroll position. */
export function selectApiMapEntry(path: string, { scrollToArticle = false } = {}): void {
  const hash = `#${path}`;
  if (window.location.hash !== hash) {
    history.pushState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  if (scrollToArticle) scrollToApiMapArticle();
}
