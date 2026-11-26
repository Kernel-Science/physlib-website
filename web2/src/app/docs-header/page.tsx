"use client";

import { useEffect } from "react";

export default function DocsHeader() {
  useEffect(() => {
    const frame = window.frameElement as HTMLIFrameElement | null;
    if (!frame) return;

    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!link || (link.target && link.target !== "_self")) return;
      event.preventDefault();
      event.stopPropagation();
      window.parent.location.assign(link.href);
    };

    const footer = document.querySelector("body > footer");
    if (frame.classList.contains("docs-site-footer") && footer) {
      document.documentElement.dataset.docsFrame = "footer";
      const syncFooter = () => {
        const theme = frame.ownerDocument.documentElement.dataset.theme;
        if (theme && document.documentElement.dataset.theme !== theme) {
          document.documentElement.dataset.theme = theme;
        }
        frame.style.height = `${Math.ceil(footer.getBoundingClientRect().height)}px`;
      };
      const size = new ResizeObserver(syncFooter);
      size.observe(footer);
      const theme = new MutationObserver(syncFooter);
      theme.observe(frame.ownerDocument.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      document.addEventListener("click", navigate, true);
      syncFooter();
      return () => {
        size.disconnect();
        theme.disconnect();
        document.removeEventListener("click", navigate, true);
      };
    }

    const header = document.querySelector("body > header");
    if (!header) return;

    const docs = frame.ownerDocument;
    const toggle = docs.querySelector<HTMLInputElement>("#nav_toggle");
    const modules = document.createElement("button");
    modules.className = "docs-module-toggle";
    modules.type = "button";
    modules.textContent = "Modules";
    modules.setAttribute("aria-label", "Modules");
    modules.setAttribute("aria-expanded", String(toggle?.checked ?? false));
    const toggleModules = () => {
      if (!toggle) return;
      toggle.checked = !toggle.checked;
      modules.setAttribute("aria-expanded", String(toggle.checked));
    };
    if (toggle) {
      header.firstElementChild?.lastElementChild?.append(modules);
      modules.addEventListener("click", toggleModules);
    }

    const sidebar = docs.querySelector<HTMLIFrameElement>("iframe.navframe");
    const fitSidebarContent = () => {
      const list = sidebar?.contentDocument?.querySelector("nav");
      if (!list) return;
      const height = Math.ceil(list.getBoundingClientRect().height);
      docs.documentElement.style.setProperty("--docs-sidebar-content-height", `${height}px`);
    };
    let sidebarSize: ResizeObserver | undefined;
    const scrollPageFromSidebar = (event: WheelEvent) => {
      if (event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.parent.innerHeight : 1;
      window.parent.scrollBy(0, event.deltaY * scale);
    };
    const bindSidebar = () => {
      const sidebarDocument = sidebar?.contentDocument;
      const list = sidebarDocument?.querySelector("nav");
      if (!sidebarDocument || !list) return;
      sidebarDocument.addEventListener("wheel", scrollPageFromSidebar, { passive: false });
      sidebarSize?.disconnect();
      sidebarSize = new ResizeObserver(fitSidebarContent);
      sidebarSize.observe(list);
      fitSidebarContent();
    };
    sidebar?.addEventListener("load", bindSidebar);
    bindSidebar();

    const sync = () => {
      const menu = header.nextElementSibling;
      const mobileOpen = menu?.classList.contains("fixed") && getComputedStyle(menu).display !== "none";
      const panels = Array.from(header.querySelectorAll<HTMLElement>('[aria-expanded="true"][aria-controls]'))
        .map((button) => document.getElementById(button.getAttribute("aria-controls") ?? ""));
      const headerBottom = header.getBoundingClientRect().bottom;
      const bottom = Math.max(headerBottom, ...panels.map((panel) => panel?.getBoundingClientRect().bottom ?? 0));
      frame.style.height = `${mobileOpen ? window.parent.innerHeight : Math.ceil(bottom)}px`;

      const theme = document.documentElement.dataset.theme;
      if (theme) frame.ownerDocument.documentElement.dataset.theme = theme;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-expanded"] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.parent.addEventListener("resize", sync);
    document.addEventListener("click", navigate, true);
    sync();
    return () => {
      observer.disconnect();
      sidebarSize?.disconnect();
      window.parent.removeEventListener("resize", sync);
      document.removeEventListener("click", navigate, true);
      modules.remove();
      modules.removeEventListener("click", toggleModules);
      sidebar?.removeEventListener("load", bindSidebar);
      sidebar?.contentDocument?.removeEventListener("wheel", scrollPageFromSidebar);
    };
  }, []);

  return (
    <style data-docs-header-frame>{`
      html:has([data-docs-header-frame]), body:has([data-docs-header-frame]) {
        background: transparent;
      }
      body:has([data-docs-header-frame]) > div:has([data-docs-header-frame]),
      body:has([data-docs-header-frame]) > footer {
        display: none;
      }
      html:has([data-docs-header-frame]) nextjs-portal { display: none !important; }
      html[data-docs-frame="footer"] body > header { display: none; }
      html[data-docs-frame="footer"] body > footer { display: block; }
      .docs-module-toggle {
        display: none;
        height: 2rem;
        padding-inline: 0.45rem;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        color: color-mix(in srgb, var(--foreground) 68%, var(--background));
        font-size: 0.75rem;
      }
      @media (max-width: 1000px) {
        .docs-module-toggle { display: inline-block; }
      }
      @media (max-width: 420px) {
        .docs-module-toggle { width: 2rem; padding: 0; font-size: 0; }
        .docs-module-toggle::before { content: "☷"; font-size: 1rem; }
      }
      @media (width < 360px) {
        body > header > div { padding-inline: 0.5rem; }
        body > header > div > div { gap: 0.25rem; }
        body > header button[aria-label^="Switch to"] { width: 2rem; min-width: 2rem; }
      }
      @media (768px <= width < 1100px) {
        body > header > div > nav { display: none; }
        body > header button[aria-label="Toggle menu"] { display: inline-flex; }
        body > header + div.fixed { display: flex; }
      }
      .docs-heading-tools, .docs-scope-toggle { display: inline-flex; align-items: baseline; }
      .docs-heading-tools { gap: .75rem; }
      .docs-scope-toggle { gap: .3rem; }
      .docs-header-page-name, .docs-scope-toggle {
        white-space: nowrap;
        color: color-mix(in srgb, var(--foreground) 62%, var(--background));
        font: 400 0.8125rem var(--font-geist-sans), ui-sans-serif, sans-serif;
      }
      a.docs-header-page-name:hover { text-decoration: underline; text-underline-offset: 0.2em; }
      .docs-scope-toggle button { font: inherit; color: inherit; text-decoration: none; cursor: pointer; padding-block: .35rem; }
      .docs-scope-toggle button[aria-pressed="true"] { color: var(--accent); }
      .docs-scope-toggle button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      @media (max-width: 420px) {
        body > header > div { padding-inline: .65rem; }
        .docs-brand, .docs-heading-tools { gap: .45rem; }
      }
      @media (max-width: 480px) {
        .docs-brand { align-items: flex-start; flex-direction: column; gap: 0; }
        .docs-scope-toggle button { padding-block: .1rem; }
      }
    `}</style>
  );
}
