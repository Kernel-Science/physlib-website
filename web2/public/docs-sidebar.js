const groups = new Map();

for (const folder of document.querySelectorAll(".module_list details.nav_sect")) {
  const parent = folder.parentElement;
  if (!groups.has(parent)) groups.set(parent, `docs-folders-${groups.size}`);
  folder.setAttribute("name", groups.get(parent));
}

const tree = document.querySelector(".module_list");
if (tree) {
  const libraries = [...tree.children].map(element => ({
    element,
    name: element.querySelector(":scope > summary, :scope > a")?.textContent.trim(),
  }));
  const nav = tree.parentElement;
  const heading = tree.previousElementSibling;
  const general = [...nav.children].slice(0,[...nav.children].indexOf(heading));
  const physlib = libraries.find(library => library.name === "Physlib")?.element;
  const rootAccordion = physlib?.getAttribute("name");
  const page = window.parent;
  let selected = "all";
  const storageKey = "physlib-docs-library-scope";
  try {
    const from = page.document.referrer ? new URL(page.document.referrer) : null;
    const fromDocs = from?.origin === page.location.origin && from.pathname.startsWith("/docs/");
    const landingPage = ["/docs/", "/docs/index.html"].includes(page.location.pathname);
    if (!landingPage && fromDocs && sessionStorage.getItem(storageKey) === "physlib") {
      selected = "physlib";
    } else {
      sessionStorage.removeItem(storageKey);
    }
  } catch { /* The controls also work when browser storage is disabled. */ }

  function show(value) {
    tree.dataset.scope = value;
    for (const library of libraries) {
      library.element.hidden = value === "physlib" && library.name !== "Physlib";
    }
    for (const item of general) item.hidden = value === "physlib";
    if (heading?.matches("h3")) heading.hidden = value === "physlib";
    if (physlib) {
      if (value === "physlib") {
        // Expanding a hidden dependency's current path must not close Physlib.
        physlib.removeAttribute("name");
        physlib.open = true;
      } else if (rootAccordion) {
        physlib.setAttribute("name", rootAccordion);
      }
    }
    const active = tree.querySelector('a[aria-current="page"]');
    if (active && (value === "all" || physlib?.contains(active))) {
      for (let folder = active.closest("details"); folder; folder = folder.parentElement.closest("details")) folder.open = true;
    }
    page.document.documentElement.dataset.docsScope = value;
    page.dispatchEvent(new Event("physlib:docs-scope-updated"));
  }
  function changeScope(event) {
    const value = event.detail;
    if (value !== "physlib" && value !== "all") return;
    try { sessionStorage.setItem(storageKey,value); } catch { /* Keep the selection for this page. */ }
    show(value);
  }
  page.addEventListener("physlib:docs-scope-change",changeScope);
  window.addEventListener("pagehide",event => {
    if (!event.persisted) page.removeEventListener("physlib:docs-scope-change",changeScope);
  });
  show(selected);
}
