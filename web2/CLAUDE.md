@AGENTS.md

# "On this page" sidebar

Every content page gets its right-hand "On this page" sidebar for free from
`ConditionalSidebar` → `TableOfContents` (see `src/components/table-of-contents.tsx`),
which scans `main h2[id], main h3[id], main header[id]` on mount. A page with
no `id`'d headings renders with **no sidebar at all** (not an empty one) -
compare `/apis` or `/todo` (no ids, no sidebar) with `/documentation-tracker`
or `/getting-started` (id'd headings, sidebar present).

When adding a new page under `src/app/`, give at least one top-level section
an `id` (e.g. `<h2 id="reference-library" className="... scroll-mt-24">` or
`<PageHeader id="..." .../>`) so it matches the rest of the site instead of
silently rendering full-width with no sidebar.

Caveat: the generic TOC only re-scans headings on route change (`useEffect`
keyed on `pathname`), not on client-side state changes - it doesn't work for a
page whose sections are tabs/views that swap without navigating.

For that case (or any page that wants real sidebar *navigation* rather than a
same-page outline), give the route its own sidebar in `ConditionalSidebar`
instead, following the `/api-tracker` and `/references` pattern:
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
