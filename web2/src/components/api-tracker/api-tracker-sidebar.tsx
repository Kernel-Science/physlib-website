"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ApiMap, ApiMapNode } from "@/lib/yaml";
import { buildFolderTree, flattenFolderTree, type FolderEntry } from "@/lib/api-map-folders";
import { selectApiMapEntry } from "@/lib/api-map-hash";
import { API_STATUS_DOT, API_STATUS_LABEL, apiStatusKind } from "@/lib/api-map-status";

function decodeHash(): string {
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function MapList({
  nodes,
  activePath,
  indented = true,
}: {
  nodes: ApiMapNode[];
  activePath: string;
  indented?: boolean;
}) {
  return (
    <ul className="flex flex-col">
      {nodes.map((node) => {
        const { path, title } = node;
        const isActive = path === activePath;
        const status = apiStatusKind(node);
        return (
          <li key={path}>
            <a
              href={`/api-tracker#${path}`}
              onClick={(e) => {
                if (window.location.pathname !== "/api-tracker" || e.metaKey || e.ctrlKey
                  || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                selectApiMapEntry(path, { scrollToArticle: true });
              }}
              aria-current={isActive ? "location" : undefined}
              title={title}
              className={`flex items-center rounded-lg py-1.5 pr-3 text-sm transition-colors ${
                isActive ? "text-accent font-medium" : "text-muted hover:text-foreground"
              }`}
              style={{ letterSpacing: "-0.01em", paddingLeft: indented ? 22 : 8 }}
            >
              <span className="min-w-0 flex-1 truncate">{title}</span>
              <span
                aria-hidden
                className={`ml-2 size-1.5 shrink-0 rounded-full ${API_STATUS_DOT[status]}`}
              />
              <span className="sr-only"> ({API_STATUS_LABEL[status]})</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function RootMaps({ root, activePath }: { root: FolderEntry; activePath: string }) {
  const folders = new Map<string, ApiMapNode[]>();
  for (const node of flattenFolderTree(root.children)) {
    const folder = node.path.split("/")[1];
    const maps = folders.get(folder);
    if (maps) maps.push(node);
    else folders.set(folder, [node]);
  }

  return (
    <>
      <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-muted/60">
        {root.label}
      </p>
      {root.node && <MapList nodes={[root.node]} activePath={activePath} indented={false} />}
      {[...folders].map(([folder, nodes]) => (
        <div key={folder}>
          <p className="block truncate py-1.5 pl-2 pr-3 font-mono text-[11px] text-muted/70">
            {folder}/
          </p>
          <MapList nodes={nodes} activePath={activePath} />
        </div>
      ))}
    </>
  );
}

export function ApiTrackerSidebar() {
  const pathname = usePathname();
  const [tree, setTree] = useState<FolderEntry[] | null>(null);
  const [activePath, setActivePath] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/api-map")
      .then((res) => res.json())
      .then((data: ApiMap) => {
        if (!cancelled) setTree(buildFolderTree(data.nodes));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onHashChange = () => setActivePath(decodeHash());
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pathname]);

  // Reserve the column while the tree loads so the page does not jump.
  if (!tree || tree.length === 0)
    return <aside aria-hidden="true" className="hidden w-56 shrink-0 lg:block xl:w-64" />;

  const selectedPath = pathname === "/api-tracker" ? activePath || flattenFolderTree(tree)[0]?.path : "";

  return (
    <aside className="hidden w-56 shrink-0 pt-16 lg:block xl:w-64">
      <div className="sticky top-16 mb-4 flex max-h-[calc(100dvh-5rem)] flex-col pt-6">
        <nav
          id="api-map-sidebar"
          aria-label="API maps"
          className="min-h-0 overflow-y-auto overflow-x-hidden pb-5 [mask-image:linear-gradient(to_bottom,black_calc(100%-1rem),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="pr-3 pl-6">
            {tree.map((root, i) => (
              <div key={root.path} className={i > 0 ? "mt-5" : ""}>
                <RootMaps root={root} activePath={selectedPath} />
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}
