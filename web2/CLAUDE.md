@AGENTS.md

# "On this page" sidebar

Every content page gets its left-hand "On this page" sidebar for free from
`ConditionalSidebar` → `TableOfContents` (see `src/components/table-of-contents.tsx`),
which scans `main h2[id], main h3[id], main header[id]`. The outline updates
when a heading is added, removed or renamed, including after client-side filtering.
The desktop layout reserves the sidebar column and shows the outline when at
least two headings are available.

Give each section a stable heading ID (e.g.
`<h2 id="reference-library" className="... scroll-mt-24">` or
`<PageHeader id="reference-library" .../>`) so the links land on the section.

For sidebar links that also switch views, follow the custom sidebars for the
Physlib Wiki (`/wiki`) and References (`/references`) in `ConditionalSidebar`:
- A small `src/app/api/<name>/route.ts` re-serving `data/<Name>.json`, because
  the sidebar mounts outside the page's own tree (it's a sibling of `<main>`
  in the root layout) and can't receive server-fetched props - it fetches its
  own copy client-side.
- A `src/lib/<name>-hash.ts` (`decodeXHash` / `selectXGroup`) so the sidebar
  and the page content, which don't share a React parent, coordinate through
  `history.pushState` + a manually-dispatched `hashchange` event instead - see
  `references-hash.ts` / `api-map-hash.ts`.
- The page's client component listens for `hashchange` too, and on a match:
  switches to the right view/tab, force-opens that section even if the user
  had collapsed it, clears anything (like a search filter) that could hide
  it, then `requestAnimationFrame(() => el.scrollIntoView(...))` once React
  has committed the switch - see `references-client.tsx`.
