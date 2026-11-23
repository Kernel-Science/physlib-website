const groups = new Map();

for (const folder of document.querySelectorAll(".module_list details.nav_sect")) {
  const parent = folder.parentElement;
  if (!groups.has(parent)) groups.set(parent, `docs-folders-${groups.size}`);
  folder.setAttribute("name", groups.get(parent));
}
