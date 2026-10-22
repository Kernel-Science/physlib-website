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

## Contribution tips

The authoritative document is
[Physlib's contribution tips](https://github.com/leanprover-community/physlib/blob/master/docs/contribution-tips.md).
Edit that document in Physlib. The website renders the generated copy at
`data/contribution-tips.md`; `data/contribution-tips.source.json` records its
source commit and content hash.

The **Sync contribution tips** workflow checks for changes daily and can also
be run manually from GitHub Actions. It commits only changed content and uses
the existing deployment mirror. Failed downloads or invalid Markdown leave
the last successful copy intact. This runs independently of the Lean docs build.

For a local preview before the Physlib document has merged, import a local file.

```bash
npm run sync:tips -- --source /path/to/physlib/docs/contribution-tips.md
npm run dev
```

A locally imported snapshot has a null source commit until the first successful
upstream sync. Merge the Physlib document before enabling the website workflow.

To check the sync behavior locally, run `npm run test:tips`. No dependencies
beyond Node.js 20 or newer are needed for the sync script or its tests.

Each tip uses an explicit anchor followed by a numbered level-two heading.
Keep anchors stable when reordering the tips. Both the importer and the page
validate this structure, unique anchors, and closed code fences.
