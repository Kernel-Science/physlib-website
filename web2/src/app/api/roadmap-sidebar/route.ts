import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { makeSidebarManifest } from "@/components/api-tracker/roadmap-sidebar-data";

export const dynamic = "force-static";

export async function GET() {
  const sources = ["data/RoadmapNativeFolders.json", "data/APIMap.json"];
  const [native, maps] = await Promise.all(sources.map(async name =>
    JSON.parse(await readFile(join(process.cwd(), name), "utf8"))
  ));
  return Response.json(makeSidebarManifest(native, maps.nodes));
}
