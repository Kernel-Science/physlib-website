import {
  createMcpHandler,
  localhostAllowedHostnames,
  validateHostHeader,
} from "@modelcontextprotocol/server";
import { createPhyslibMcpServer } from "@/lib/physlib-mcp";
import { site } from "@/lib/site";

const canonical = new URL(site.url);
const allowedHosts = [
  canonical.hostname,
  ...localhostAllowedHostnames(),
  ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((hostname): hostname is string => Boolean(hostname)),
];

// The SDK creates and closes a fresh MCP server for each exchange.
const handler = createMcpHandler(createPhyslibMcpServer);

async function handleRequest(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const origin = request.headers.get("origin");
  const trustedHost = validateHostHeader(host, allowedHosts).ok;
  const trustedOrigin = origin === null || origin === canonical.origin || origin === `${url.protocol}//${host}`;
  if (!trustedHost || !trustedOrigin) {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "Untrusted host or origin" } },
      { status: 403 },
    );
  }
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  return handler.fetch(request);
}

export { handleRequest as POST, handleRequest as GET, handleRequest as DELETE };
