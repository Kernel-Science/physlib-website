import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeSidebarManifest } from "@/components/api-tracker/roadmap-sidebar-data";

export const dynamic = "force-static";

export async function GET() {
  // Literal paths keep Vercel's file tracer scoped to these two files; a
  // variable path makes it trace the whole project (including public/docs),
  // which pushes the function past Vercel's 250 MB size limit.
  const [native, maps] = await Promise.all([
    readFile(join(process.cwd(), "data", "RoadmapNativeFolders.json"), "utf8"),
    readFile(join(process.cwd(), "data", "APIMap.json"), "utf8"),
  ]).then(texts => texts.map(text => JSON.parse(text)));
  return Response.json(makeSidebarManifest(native, maps.nodes));
}
