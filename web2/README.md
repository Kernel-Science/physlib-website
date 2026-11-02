This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Physlib Atlas

The `/atlas` pages read `data/Atlas.json`, generated from Physlib's `Atlas.md`
articles by `node scripts/generate-atlas.js`. The `Generate Atlas` workflow refreshes
this data; it also triggers the website mirror workflow.

To preview a committed Physlib change without fetching or modifying that clone:

```bash
node scripts/generate-atlas.js --repo /path/to/physlib --ref HEAD --branch my-branch --out /path/to/preview.json
npm run test:atlas
```

The generator temporarily accepts `API-map.md` as well as `Atlas.md`, preferring
`Atlas.md` when both exist in one directory. Both source layouts are supported
while the migration is under review. The checked-in data retains its original source
revision until the next refresh, with the renamed `atlas` and `hasAtlas` fields.
Legacy source filenames in that snapshot are intentional.

Existing `/api-tracker` links redirect to `/atlas`, retaining query parameters and
article fragments. The sidebar endpoint moves from `/api/api-map` to `/api/atlas`
with a redirect. New article templates and GitHub new-file links use `Atlas.md`.
Edit suggestions retain the `api-map-edit` v1 wire format for existing consumers;
their target file is taken from the selected article.

Read-only article and writing-guide links point to the data snapshot's commit,
so a cached page remains readable after the source filenames change. The generator
records the guide filename present at that revision; older cached data uses its
original `API_MAP_GUIDE.md`. GitHub edit links continue to follow the live branch.

For rollout, merge Physlib first. Then run `node scripts/generate-atlas.js` from
`web2/` on the website branch, and commit the refreshed `data/Atlas.json` into the
website PR before merging it second. Check article selection, guide links, and an
edit target against that refreshed data. Later refreshes use the `Generate Atlas`
workflow. The migration tests exercise legacy,
partially renamed, fully renamed, and duplicate-file Git trees, plus the refresh
workflow's output path and mirror trigger name.
