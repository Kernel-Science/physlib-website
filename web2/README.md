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

## Find contribution tasks with an agent

Connect an MCP client using Streamable HTTP at `/api/mcp` on the running site.
With the default development server, the URL is `http://localhost:3000/api/mcp`.
Try asking “Which issues are open for the website, and how do I preview a change?”

- `find_tasks` searches website issues and the Lean library's issues, TODOs, documentation tasks, and API map work. Set `repository` to `website` or `library` to narrow the search. Each result links to its source.
- `get_contribution_guide` lists the guides or reads one by ID. Use `website` for local setup and the website PR target. The other guides cover getting started, the library's AI guidelines, and opening a library PR. Clients can also read these guides as Markdown resources.

Scripts can use the same search at `GET /api/tasks`. For example, `/api/tasks?repository=website` lists open website issues, and `/api/tasks?repository=library&q=qubit&limit=5` finds library work mentioning qubits. Check `sources` for data availability and use `nextOffset` to request the next page.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
