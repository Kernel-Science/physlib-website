export function isWikiReaderPath(pathname: string): boolean {
  return pathname === "/api-maps" || pathname === "/wiki" || pathname === "/globe" || pathname === "/api-tracker";
}

export function parseWikiFile(fragment: string) {
  const match = /^(file|verso)=([^&]+)(?:&view=docs)?(?:&anchor=(.*))?$/u.exec(fragment);
  if (!match) return undefined;
  return { kind: match[1], path: match[2], anchor: match[3] ?? "" };
}

export function docsFileFragment(pathname: string, hash = ""): string | undefined {
  const match = /^\/docs\/((?:Physlib|PhyslibAlpha|QuantumInfo)(?:\/[^/]+)*)\.html$/u.exec(pathname);
  if (!match) return undefined;
  return "file=" + match[1] + (hash ? "&anchor=" + hash.replace(/^#/, "") : "");
}

export function scrollToApiMapArticle(): void {
  document.getElementById("api-map-reader-title")?.scrollIntoView({
    block: "start",
    inline: "nearest",
    behavior: "instant",
  });
}

/** Flowchart selections keep their reading position. Article and sidebar
 * links move to the selected title. Both preserve the current page query. */
export function selectApiMapEntry(path: string, { scrollToArticle = false } = {}): void {
  const hash = path ? `#${path}` : "";
  if (window.location.hash !== hash) {
    history.pushState(null, "", window.location.pathname + window.location.search + hash);
    window.dispatchEvent(new CustomEvent("hashchange", { detail: { scrollToArticle } }));
  } else if (scrollToArticle) {
    scrollToApiMapArticle();
  }
}
