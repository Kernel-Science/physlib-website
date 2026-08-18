---
name: physlib-design-language
description: Design language, layout, and data-generation conventions for the Physlib website (web2 Next.js app). Load before adding or modifying any page, component, or data-generation script in web2, so new UI matches the rest of the site instead of inventing a one-off layout.
---

# Physlib website design language

This site (`web2/`) has established, repeated conventions. New pages should
reuse them rather than build ad-hoc layouts — a page that looks or is wired
differently from its siblings is a design bug, not a stylistic choice.

## Page shell

Every content page wraps its content the same way:

```tsx
<div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
  <h1 className="text-4xl font-bold tracking-tight mb-2">Page Title</h1>
  <p className="text-muted mb-8 leading-relaxed">Intro copy.</p>
  {/* page content */}
</div>
```

`max-w-5xl` is the default. Don't widen it to fit extra UI (e.g. a sidebar) —
see below, sidebars are not page content.

## Root layout & the left sidebar slot

`src/app/layout.tsx` renders a persistent flex row:

```
<Navbar />
<div className="flex w-full flex-1">
  <ConditionalSidebar />
  <main className="min-w-0 flex-1 pt-14">{children}</main>
</div>
```

`ConditionalSidebar` (`src/components/conditional-sidebar.tsx`) picks a
sidebar by route:

```ts
if (pathname === "/") return null;
if (pathname.startsWith("/monthly-updates")) return <MonthSidebar />;
if (pathname.startsWith("/api-tracker")) return <ApiTrackerSidebar />;
return <TableOfContents />; // default: auto-built from h2/h3 on the page
```

**If a new page needs left-rail navigation (a list of items, a tree, a table
of contents), add a branch here and a dedicated sidebar component.** Do not
build the sidebar inline inside the page/client component with a local flex
layout — that duplicates the shell, breaks the shared sticky/scroll behavior,
and is the mistake this skill exists to prevent (it's what the API Tracker
page did on the first pass, before being corrected to match this pattern).

### Sidebar visual pattern

Every left sidebar (`TableOfContents`, `MonthSidebar`, `ApiTrackerSidebar`)
uses the same markup:

```tsx
<aside className="hidden w-52 shrink-0 lg:block pt-16">
  <nav className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto px-3 py-8">
    <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
      Section label
    </p>
    <ul className="flex flex-col">
      <li>
        <a /* or <Link> for route changes, plain <a href="#..."> for in-page */
          className={`flex items-center rounded-lg px-2 py-1.5 text-sm transition-colors ${
            isActive ? "text-accent font-medium" : "text-muted hover:text-foreground"
          }`}
          style={{ letterSpacing: "-0.01em" }}
        >
          {isActive && <span className="mr-2 size-1 rounded-full bg-accent flex-shrink-0" />}
          Item label
        </a>
      </li>
    </ul>
  </nav>
</aside>
```

- Hidden below `lg`; sticky at `top-16`, independently scrollable
  (`max-h-[calc(100vh-4rem)] overflow-y-auto`).
- Active item = `text-accent font-medium` + a small accent dot prefix. Inactive
  = `text-muted hover:text-foreground`.
- Nested/indented levels use extra left padding (either a Tailwind step like
  `pl-6` for a fixed two-level case, or `style={{ paddingLeft: 8 + depth * 16 }}`
  for an arbitrary-depth tree) — never a second nested `<aside>`.
- If the sidebar's content lives in a different part of the tree than the
  page it controls (e.g. it's rendered by `ConditionalSidebar`, sibling to
  `<main>`, not a child of the page component), coordinate selection through
  the URL — `router`/`pathname` for route-based active state (`MonthSidebar`),
  or `window.location.hash` + a `hashchange` listener for in-page selection
  that isn't a route change (`ApiTrackerSidebar` / `api-flowchart.tsx`).
  Don't reach for cross-tree React context for this — the existing sidebars
  don't use it, and the URL is already the natural shared channel.
- `<aside>` should normally stay a plain fixed `w-52` (that's what the flex
  layout actually reserves, so it doesn't push `<main>`'s centered
  `max-w-5xl` content over) while `<nav>` inside it is free to be visually
  wider - it can overflow past `<aside>`'s edge with no layout effect, which
  `ApiTrackerSidebar` uses twice: by default, `<nav>` is sized with
  `clamp(13rem, calc(100vw - 992px), 20rem)` so it fills the gutter up to
  where the centered content actually starts instead of leaving it blank
  (992 = max-w-5xl's 1024px + the content's own 16px px-4, solved so the
  sidebar's right edge lands exactly on the content's left edge - see that
  file's comment before reusing this elsewhere, since the constant is
  coupled to page.tsx's own max-w-5xl/px-4 and needs to move with it); on
  `hover:`, it goes wider still (`w-96`, a fixed target so the transition
  actually animates - browsers don't tween to/from `max-content`/`w-max`)
  to fit whatever's still truncated at the default's cap, gaining a
  background/shadow only in that state since only then is it overlapping
  real content rather than empty gutter.

## Color tokens

Defined in `src/app/globals.css` as CSS variables, both light and dark:

- `--background` / `--foreground` — page background / primary text.
- `--accent` — the one brand blue, used for links, active states, primary
  buttons (`text-accent`, `bg-accent`, `border-accent`).
- `--muted` — secondary text (`text-muted`).
- `--border` — hairlines (`border-border`).
- `--surface` / `--surface-secondary` — card/table backgrounds.
- Status colors (`success` / `warning` / `danger`) exist for state badges,
  used as e.g. `bg-success/15 text-success border-success/30` (see the status
  pills on `/apis`).

Always use these Tailwind utility classes (`text-accent`, `text-muted`,
`border-border`, etc.), never hardcoded hex colors, for anything that should
adapt to light/dark mode. Hardcoded hex is only acceptable for content that
is itself color-coded data (e.g. Graphviz node fill colors representing
status) rather than UI chrome.

## Generated data pattern

Several pages are backed by data generated from the `leanprover-community/physlib`
source repo rather than hand-authored:

- A script in `web2/scripts/generate-*.js` clones/reuses a bare mirror at
  `web2/.cache/physlib.git` (gitignored), reads what it needs via `git`
  plumbing, and writes a committed file under `web2/data/`.
- `src/lib/yaml.ts` exposes a typed accessor (`getX()`) that reads that file
  at request/build time.
- A GitHub Actions workflow (`.github/workflows/*.yml`, modeled on
  `monthly-updates.yml`) runs the generator on a schedule, commits the result,
  and explicitly mirrors the commit to the Vercel deploy repo (pushes made
  with the default `GITHUB_TOKEN` don't trigger `mirror-to-personal.yml`).

Follow this pattern for any new page whose data comes from the Physlib
source repo rather than GitHub's live API — see `generate-api-map.js` /
`data/APIMap.json` / `api-map.yml` (workflow) for the most recent example.
