"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { isWikiReaderPath, selectApiMapEntry } from "@/lib/api-map-hash";
import { API_STATUS_DOT, API_STATUS_LABEL, type ApiStatusKind } from "@/lib/api-map-status";
import { Chevron } from "@/components/chevron";
import { articleHref, type SidebarArticle, type SidebarManifest } from "./roadmap-sidebar-data";
import styles from "./roadmap-sidebar.module.css";

type Folder = { path: string; name: string; sourceFolders: Set<string>; articles: SidebarArticle[]; folders: Folder[] };

function displayedFolder(item: SidebarArticle) {
  return item.folder.split("/").filter(Boolean).filter((part,i) =>
    i !== 0 || (part !== "Physlib" && part !== "PhyslibAlpha")
  );
}

function buildTree(articles: SidebarArticle[]) {
  const root: Folder = { path: "", name: "", sourceFolders: new Set(), articles: [], folders: [] };
  const known = new Map([["", root]]);
  for (const item of articles) {
    let parent = root;
    const segments = displayedFolder(item);
    const source = item.folder.split("/");
    const prefix = source.slice(0, source.length - segments.length);
    for (const segment of segments) {
      prefix.push(segment);
      const path = parent.path ? parent.path + "/" + segment : segment;
      let next = known.get(path);
      if (!next) {
        next = {path, name:segment, sourceFolders:new Set(), articles:[], folders:[]};
        parent.folders.push(next);
        known.set(path,next);
      }
      next.sourceFolders.add(prefix.join("/"));
      parent = next;
    }
    parent.articles.push(item);
  }
  for (const node of known.values()) {
    node.folders.sort((a,b) => a.name.localeCompare(b.name));
  }
  return root;
}

function getKey() {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  }
  catch { return ""; }
}
function FolderName({ value }: { value: string }) {
  return <>{value.split(/(?<=[a-z])(?=[A-Z])|(?=[./])/).map((part,i) =>
    <span key={i}>{i > 0 && <wbr />}{part}</span>
  )}</>;
}
function StatusDot({status}: {status:ApiStatusKind}) {
  return <span aria-hidden="true" title={API_STATUS_LABEL[status]} data-api-status={status}
    className={`${styles.dot} size-1.5 rounded-full ${API_STATUS_DOT[status]}`} />;
}

export function ApiTrackerSidebar() {
  const pathname = usePathname();
  const [manifest,setManifest] = useState<SidebarManifest>();
  const [failed,setFailed] = useState(false);
  const [open,setOpen] = useState(false);
  const [openPath,setOpenPath] = useState("");
  const [active,setActive] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/roadmap-sidebar", {signal:controller.signal}).then(async res => {
      if (!res.ok) throw new Error(String(res.status));
      setManifest(await res.json());
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const onChange = () => {
      const key = getKey();
      setActive(key);
      if (!key) setOpenPath("");
      setOpen(false);
    };
    onChange();
    window.addEventListener("hashchange", onChange);
    window.addEventListener("physlib:reset-roadmap", onChange);
    return () => {
      window.removeEventListener("hashchange", onChange);
      window.removeEventListener("physlib:reset-roadmap", onChange);
    };
  }, [pathname]);
  const selected = useMemo(() => manifest?.articles.find(a => a.target === active), [active,manifest]);
  useEffect(() => {
    setOpenPath(selected ? displayedFolder(selected).join("/") : "");
  }, [selected]);

  const tree = useMemo(() => buildTree(manifest?.articles ?? []), [manifest]);
  const close = () => setOpen(false);
  function navigate(event: MouseEvent<HTMLAnchorElement>, article: SidebarArticle) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    close();
    const path = window.location.pathname;
    if (!isWikiReaderPath(path)) return;
    event.preventDefault();
    setOpenPath(displayedFolder(article).join("/"));
    selectApiMapEntry(article.target, {scrollToArticle:true});
  }
  function branch(node: Folder) {
    const expanded = openPath === node.path || openPath.startsWith(node.path + "/");
    const hasChildren = node.folders.length > 0;
    const label = (expanded ? "Collapse " : "Expand ") + node.path;
    const toggle = () => setOpenPath(expanded ? node.path.split("/").slice(0,-1).join("/") : node.path);
    return <li key={node.path}>
      {node.articles.length > 0 ? node.articles.map((article, i) =>
        <div className={styles.folder} key={article.target} data-has-map>
          <a href={articleHref(article)} onClick={event => navigate(event, article)}
             aria-label={`Read ${article.title}, ${API_STATUS_LABEL[article.status]}`}
             title={article.title + " · " + API_STATUS_LABEL[article.status]}
             aria-current={selected === article ? "page" : undefined} data-api-map={article.target}>
            <FolderName value={node.name || article.target}/>
            {node.articles.length > 1 && " (" + article.target.split("/")[0] + ")"}
            <StatusDot status={article.status}/>
          </a>
          {hasChildren && i === 0 && <button type="button" className={styles.disclosure}
            onClick={toggle} aria-label={label} aria-expanded={expanded}>
            <Chevron open={expanded}/>
          </button>}
        </div>
      ) : <div className={`${styles.folder} ${styles.emptyFolder}`}>
        <button type="button" className={styles.folderToggle} onClick={toggle} aria-label={label} aria-expanded={expanded}>
          <FolderName value={node.name}/><Chevron open={expanded}/>
        </button>
        {[...node.sourceFolders].map(path => (
          <a key={path} href={`/wiki/new?path=${encodeURIComponent(path)}`} className={styles.addArticle}
            aria-label={`Create a Wiki article for ${path}`}>
            +
          </a>
        ))}
      </div>}
      {expanded && hasChildren && <ul className={styles.children}>{node.folders.map(branch)}</ul>}
    </li>;
  }
  return <aside className={styles.sidebar} data-api-library-sidebar>
    <button className={styles.mobileToggle} type="button" aria-controls="api-map-sidebar"
            aria-expanded={open} onClick={() => setOpen(!open)}>
      Browse articles <Chevron open={open}/>
    </button>
    <nav id="api-map-sidebar" aria-label="Wiki articles" className={styles.nav} data-open={open}>
      <a href="/wiki" className={`site-nav-heading ${styles.home}`} aria-current={pathname === "/wiki" && !active ? "page" : undefined}
        onClick={event => {
          if (pathname !== "/wiki" || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          setOpen(false);
          setOpenPath("");
          selectApiMapEntry("");
          requestAnimationFrame(() => {
            document.getElementById("wiki")?.focus({ preventScroll: true });
            window.scrollTo({ top: 0, behavior: "instant" });
          });
        }}>Physlib Wiki</a>
      <div className={styles.scroll}>
        {!manifest ? <p className={styles.status}>{failed?"The article list could not be loaded.":"Loading articles…"}</p>
          : <ul className={styles.tree}>{tree.articles.map(article => branch({path: article.target, name: article.target, sourceFolders: new Set([article.folder]), articles: [article], folders: []}))}{tree.folders.map(branch)}</ul>}
      </div>
      <a href="/wiki/new" onClick={close} className={styles.create}>Create a Wiki article</a>
    </nav>
  </aside>;
}
