"use client";

import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

const VersoDocument = lazy(() => import("./api-tracker/verso-document"));

/** The shared site header is a same-origin iframe in the generated docs. */
export function DocsModuleView() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!window.frameElement?.classList.contains("docs-site-header")) return;
    const host = window.parent;
    const main = host.document.querySelector<HTMLElement>("main[data-verso-href]");
    if (!main) return;
    const root = host.document.createElement("div");
    root.className = "docs-view-root";
    main.prepend(root);
    const sync = () => setAddress(host.location.href);
    setMount(root);
    sync();
    host.addEventListener("popstate", sync);
    host.addEventListener("hashchange", sync);
    return () => {
      root.remove();
      delete main.dataset.moduleView;
      host.removeEventListener("popstate", sync);
      host.removeEventListener("hashchange", sync);
    };
  }, []);

  const location = address ? new URL(address) : null;
  const selected = location?.searchParams.get("view") === "verso" ? "verso" : "docs";
  const hash = location?.hash ?? "";
  const main = mount?.parentElement;
  useLayoutEffect(() => {
    if (!main) return;
    main.dataset.moduleView = selected;
    if (selected === "docs" && hash) {
      let id = hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Keep the raw anchor. */ }
      main.ownerDocument.getElementById(id)?.scrollIntoView();
    }
  }, [main, selected, hash]);
  const published = main?.dataset.versoHref;
  if (!mount || !published || !address) return null;
  const host = mount.ownerDocument.defaultView!;
  const title = mount.ownerDocument.querySelector(".docs-tools h2")?.textContent ?? "Lean module";
  const options = (["docs", "verso"] as const).map(view => {
    const destination = new URL(address);
    if (view === "verso") destination.searchParams.set("view", "verso");
    else destination.searchParams.delete("view");
    return <a key={view} href={destination.href} aria-current={selected === view ? "page" : undefined}
      onClick={event => {
        if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        if (selected === view) return;
        destination.hash = host.location.hash;
        host.history.pushState(host.history.state, "", destination);
        setAddress(destination.href);
      }}>{view === "docs" ? "Docs" : "Verso"}</a>;
  });

  return createPortal(<>
    <div className="docs-view-bar">
      <div className="docs-view-options" role="group" aria-label="Module view">{options}</div>
    </div>
    {selected === "verso" && <Suspense fallback={<p role="status">Loading the Verso article…</p>}>
      <VersoDocument href={published + hash} title={title + " — Verso"} />
    </Suspense>}
  </>, mount);
}
