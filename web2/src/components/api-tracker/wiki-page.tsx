import Link from "next/link";
import { WikiSearch } from "./wiki-search";
import { API_STATUS_DOT, API_STATUS_LABEL, type ApiStatusKind } from "@/lib/api-map-status";
import { ApiMapReader } from "@/components/api-tracker/api-map-reader";
import RoadmapViewer from "@/components/roadmap/RoadmapViewer";
import { getApiMap, type ApiMapDirectory } from "@/lib/yaml";
import { getWikiModuleReferences } from "@/lib/wiki-module-references";

const startingPoints = [
  "Physlib/ClassicalMechanics/DampedHarmonicOscillator",
  "Physlib/Cosmology/FLRW",
  "Physlib/Thermodynamics/Temperature",
];

function roadmapFolderPaths(directories: ApiMapDirectory[]): Record<string, string[]> {
  const folders: Record<string, string[]> = {};
  for (const { path } of directories) {
    const [library, ...parts] = path.split("/");
    if (library !== "Physlib" && library !== "PhyslibAlpha" && library !== "QuantumInfo") continue;
    const key = library === "QuantumInfo" ? path.replaceAll("/", ".") : parts.join(".");
    if (!key) continue;
    const paths = folders[key] ??= [];
    if (library === "Physlib") paths.unshift(path);
    else paths.push(path);
  }
  return folders;
}

export async function WikiPage({ home }: { home: "wiki" | "roadmap" }) {
  const [apiMap, referencePaths] = await Promise.all([getApiMap(), getWikiModuleReferences()]);
  const articlePaths = apiMap.nodes.flatMap(node => [node.path, ...node.parents.map(parent => parent.path)]);
  const examples = startingPoints.flatMap(folder =>
    apiMap.nodes.filter(article => article.path === folder)
  );
  return (
    <div className="px-4 pt-5 pb-12 sm:px-8 sm:pt-7">
      <ApiMapReader articlePaths={articlePaths} referencePaths={referencePaths} home={home}>
        {home === "roadmap" ? (
          <>
            <header id="roadmap" tabIndex={-1} className="sticky top-14 z-20 -mt-2 mb-2 scroll-mt-20 bg-background py-2">
              <h1 className="text-2xl font-semibold tracking-tight">Physlib Atlas</h1>
            </header>
            <RoadmapViewer referencePaths={referencePaths} folderPaths={roadmapFolderPaths(apiMap.directories)} />
          </>
        ) : (
          <div className="mx-auto max-w-3xl py-4 sm:py-8">
            <p className="label-mono text-muted mb-5">Explore</p>
            <h1 id="wiki" tabIndex={-1} className="page-title-editorial">API Maps</h1>
            <p className="page-intro-editorial mt-3">
              Each API Map describes the physics in a Physlib folder and links its claims to the corresponding Lean results.
            </p>
            <WikiSearch />
            {examples.length > 0 && (
              <section className="mt-9" aria-labelledby="wiki-start">
                <h2 id="wiki-start" className="mb-3 text-lg font-semibold">Explore a topic</h2>
                <ul className="divide-y divide-border border-y border-border">
                  {examples.map(article => (
                    <li key={article.path} className="py-3">
                      <a href={`/api-maps#${article.path}`} className="font-medium text-accent hover:underline">{article.title}</a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <div className="mt-7 rounded-(--radius) border border-border bg-surface px-4 py-3 text-sm">
              <p className="text-muted">
                <strong className="font-semibold text-foreground">Bold folders</strong> have an API Map. The dot shows its formalization progress.
              </p>
              <ul aria-label="Article formalization progress" className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                {(Object.keys(API_STATUS_LABEL) as ApiStatusKind[]).map(status => (
                  <li key={status} className="inline-flex items-center gap-1.5">
                    <span aria-hidden="true" className={`size-1.5 rounded-full ${API_STATUS_DOT[status]}`} />{API_STATUS_LABEL[status]}
                  </li>
                ))}
              </ul>
              <Link href="/api-maps/new" className="mt-3 inline-block text-accent hover:underline">Create an API Map</Link>
            </div>
          </div>
        )}
      </ApiMapReader>
    </div>
  );
}
