import { readFile } from "node:fs/promises";
import path from "node:path";

type SearchRow = { kind: string; href: string };

export async function getWikiModuleReferences(): Promise<Record<string, string>> {
  const dataDirectory = path.join(process.cwd(), "data");
  // Each module row is emitted only after reading its generated HTML file.
  // Import-only modules have useful documentation even without declarations.
  const [searchJson, nativeJson] = await Promise.all([
    readFile(path.join(dataDirectory, "LeanSearchIndex.json"), "utf8").catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return "[]";
      throw error;
    }),
    readFile(path.join(dataDirectory, "RoadmapNativeFolders.json"), "utf8"),
  ]);
  const rows: SearchRow[] = JSON.parse(searchJson);
  const { formerFiles }: { formerFiles: Record<string, string> } = JSON.parse(nativeJson);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.kind !== "module") continue;
    const module = /^\/docs\/((?:Physlib|PhyslibAlpha|QuantumInfo)(?:\/[^/#?]+)*)\.html$/u.exec(row.href)?.[1];
    if (module) result[module] = row.href;
  }
  for (const [oldFile, currentFile] of Object.entries(formerFiles)) {
    const before = oldFile.replace(/\.lean$/, "");
    const after = currentFile.replace(/\.lean$/, "");
    const destination = result[after] ?? result[before];
    if (destination) {
      result[before] = destination;
      result[after] = destination;
    }
  }
  return result;
}
