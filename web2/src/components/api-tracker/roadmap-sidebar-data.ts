import { apiStatusKind, type ApiStatusKind } from "@/lib/api-map-status";
import type { ApiMapNode } from "@/lib/yaml";

export type SidebarArticle = {
  kind: "map";
  target: string;
  title: string;
  folder: string;
  status: ApiStatusKind;
};
export type SidebarManifest = { articles: SidebarArticle[] };

type NativeFolders = {
  folders: { path: string; libraries: string[]; apiMaps: string[] }[];
  quantumInfoFolders: string[];
};

export function makeSidebarManifest(native: NativeFolders, maps: ApiMapNode[]): SidebarManifest {
  const folders = new Set(["Physlib", "PhyslibAlpha", ...native.quantumInfoFolders]);
  for (const entry of native.folders) {
    for (const library of [...entry.libraries, ...entry.apiMaps]) {
      folders.add(library + "/" + entry.path.replaceAll(".", "/"));
    }
  }
  const articles = maps.map(map => {
    if (!folders.has(map.path)) throw new Error("API map folder missing from native tree: " + map.path);
    return {kind: "map" as const, target: map.path, title: map.title, folder: map.path, status: apiStatusKind(map)};
  });
  return {articles};
}

export function articleHref(item: SidebarArticle) {
  return "/wiki#" + item.target.split("/").map(encodeURIComponent).join("/");
}
