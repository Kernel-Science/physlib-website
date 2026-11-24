import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { contributionGuides } from "@/lib/contribution-guides";
import { site } from "@/lib/site";
import { searchTasks, taskQuerySchema } from "@/lib/task-discovery";

const guides = contributionGuides.map((guide) => ({
  ...guide,
  uri: `physlib://guides/${guide.id}`,
}));

export function createPhyslibMcpServer() {
  const server = new McpServer(
    { name: "physlib-contributions", title: "Contribute to Physlib", version: "1.0.0", websiteUrl: site.url },
    {
      instructions:
        "Use get_contribution_guide for setup, AI contribution guidance, and first steps. " +
        "Use find_tasks to look for work on the website or the Lean library. " +
        "Source links lead back to the project where contributors coordinate the work.",
    },
  );

  server.registerTool("find_tasks", {
    title: "Find a Physlib task",
    description:
      "Search website issues and the Physlib library's GitHub issues, Lean TODOs, documentation tasks, " +
      "and Wiki article tasks. Results include source links and indicate which sources were available.",
    inputSchema: taskQuerySchema,
    annotations: { readOnlyHint: true },
  }, async (query) => {
    const result = await searchTasks(query);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  });

  server.registerTool("get_contribution_guide", {
    title: "Read a Physlib contribution guide",
    description: "List the available guides, or choose an id to read the guide and follow its source links.",
    inputSchema: z.strictObject({
      id: z.enum(guides.map((guide) => guide.id)).optional(),
    }),
    annotations: { readOnlyHint: true },
  }, ({ id }) => {
    const guide = guides.find((item) => item.id === id);
    if (guide) {
      return {
        content: [{ type: "text", text: guide.text }],
        structuredContent: { ...guide },
      };
    }
    const index = guides.map(({ id, title, description, uri, url }) => ({ id, title, description, uri, url }));
    return {
      content: [{ type: "text", text: JSON.stringify(index) }],
      structuredContent: { guides: index },
    };
  });

  for (const guide of guides) {
    server.registerResource(guide.id, guide.uri, {
      title: guide.title,
      description: guide.description,
      mimeType: "text/markdown",
    }, (uri) => ({
      contents: [{ uri: uri.href, mimeType: "text/markdown", text: guide.text }],
    }));
  }

  return server;
}
