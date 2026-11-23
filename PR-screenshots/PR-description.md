Follow-up to [Kernel-Science#48](https://github.com/Kernel-Science/physlib-website/pull/48). This draft targets the branch from #48 so the comparison shows the documentation and footer changes. It can target upstream after #48 merges.

## Changes

- Give generated Lean documentation the shared Physlib header and footer. The Documentation link returns to the docs index from any module.
- Put declaration search below the Lean version on the docs index. Open module pages by their names and use the chevrons to expand folders. Keep General and Library visible, highlight the current row, and align the group labels with the Physlib wordmark.
- Keep the full module tree in the page’s scroll area. The desktop left navigation is sticky within the content area and stops above the footer. The right-hand declaration outline moves with the page.
- Change the footer credit to “Website supported by,” tighten the spacing around the Kernel Science mark, and align it in light and dark mode. Capitalize Contribution Reports on the homepage.

## Before and after

The docs pairs use the same generated pages at 1440 × 1000. The credit row uses a 390 × 844 dark-mode viewport.

| View | Before | After |
| --- | --- | --- |
| Documentation home | ![Previous docs homepage](https://raw.githubusercontent.com/SabrinaPasterski/physlib-website/4773c048460bddcb71cf8559ffe906fdbbb7eb93/screenshots/before-docs-index.png) | ![Docs homepage with site chrome and inline declaration search](https://raw.githubusercontent.com/SabrinaPasterski/physlib-website/4773c048460bddcb71cf8559ffe906fdbbb7eb93/screenshots/after-docs-index.png) |
| Module page | ![Previous module layout](https://raw.githubusercontent.com/SabrinaPasterski/physlib-website/4773c048460bddcb71cf8559ffe906fdbbb7eb93/screenshots/before-docs-module.png) | ![Module layout with aligned navigation and selected row](https://raw.githubusercontent.com/SabrinaPasterski/physlib-website/4773c048460bddcb71cf8559ffe906fdbbb7eb93/screenshots/after-docs-module.png) |
| Footer credit | ![Previous mobile dark-mode credit](https://raw.githubusercontent.com/SabrinaPasterski/physlib-website/4773c048460bddcb71cf8559ffe906fdbbb7eb93/screenshots/before-credit.png) | ![Updated mobile dark-mode credit](https://raw.githubusercontent.com/SabrinaPasterski/physlib-website/4773c048460bddcb71cf8559ffe906fdbbb7eb93/screenshots/after-credit.png) |

## Verification

- TypeScript and the updated docs scripts passed syntax checks.
- Browser-checked the docs navigation, declaration search, sticky left nav, full module tree, and placement of the footer below both sidebars on long module pages.
- Compared the shared footer across 14 regular pages and three docs pages in desktop and mobile layouts, including light and dark theme checks.
