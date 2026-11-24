"use client";

import { useMemo, useState } from "react";
import type { Declaration } from "./layout";
import type { ExternalChoice, ExternalGroup, ExternalView } from "./external-declarations";
import styles from "./roadmap.module.css";

function statusLabel(status?: string) {
  if (status === "sorry") return "Contains sorry";
  if (status === "admit") return "Contains admit";
  if (status === "axiom") return "Axiom";
  return "Source declaration";
}

export function ExternalDetails({group, choice, view, visible, onChoose}: {
  group: ExternalGroup; choice?: ExternalChoice; view: ExternalView; visible: boolean;
  onChoose: (selection: ExternalChoice, decl?: Declaration) => void;
}) {
  const [query,setQuery] = useState("");
  const [limit,setLimit] = useState(40);
  const project = choice?.project ?? view.file?.project ?? group.project ?? group.label;
  const q = query.trim().toLowerCase();
  const file = view.file;
  const declaration = view.decl;
  const duplicateNames = useMemo(() => {
    const seen = new Set<string>(), duplicates = new Set<string>();
    for (const file of view.files ?? []) {
      const name = file.path.split("/").at(-1)!;
      if (seen.has(name)) duplicates.add(name);
      seen.add(name);
    }
    return duplicates;
  },[view.files]);
  const chooseLine = (d: Declaration) => onChoose({ ...choice, project:d.project, path:d.filePath, line:d.line, name:d.name },d);
  const filteredFiles = q ? view.files?.filter(f => (f.path+" "+f.project).toLowerCase().includes(q)) : view.files;
  const filteredDecls = q ? view.rows?.filter(row => row.name.toLowerCase().includes(q)) : view.rows;
  const count = choice?.path ? filteredDecls?.length ?? 0 : filteredFiles?.length ?? 0;
  return <div className={styles.projectFiles}>
    {choice?.path && <div className={styles.crumbs}>{group.inline && project ? <a className={styles.resource} href={`https://github.com/${project}`}>{project} ↗</a> : <button onClick={() => onChoose({all:choice.all})}>{project}</button>}
      {choice?.line && <button onClick={() => onChoose({all:choice.all,topic:choice.topic,path:choice.path,project})}>{file?.name ?? choice.path.split("/").at(-1)}</button>}</div>}
    {view.error && <p role="alert">The declaration index could not be loaded.</p>}
    {file && <a className={styles.resource} href={declaration?.href ?? file.href}>
      {declaration ? `${file.path} · Line ${declaration.line}` : file.path} ↗</a>}
    {declaration && <p>{statusLabel(declaration.status)}</p>}
    {choice?.line && !declaration && !view.error && <p role="status">{view.rows ? "The source location is missing from this index." : "Loading source location…"}</p>}
    {!choice?.line && <>
      {group.inline && !choice?.path && <h3>Lean Files</h3>}
      {!choice?.path && <p>{(choice?.all ? group.totalCount ?? group.count : group.count).toLocaleString()} declarations{view.files && ` in ${view.files.length.toLocaleString()} Lean files`}</p>}
      {group.allFilesHref && !choice?.path && <button onClick={() => {setQuery("");setLimit(40);onChoose({all:!choice?.all});}}>
        {choice?.all ? "Files in This Topic" : "All Project Files"}</button>}
      {file && <p>{file.count.toLocaleString()} declarations</p>}
      {(!view.files || (choice?.path && !view.rows)) && !view.error && <p role="status">Loading {choice?.path ? "declarations" : "files"}…</p>}
      {count > 10 || query ? <input type="search" aria-label={choice?.path ? "Filter Declarations" : "Filter Project Files"}
        placeholder={choice?.path ? "Find a Declaration…" : "Find a Lean File…"} value={query}
        onChange={e => {setQuery(e.target.value);setLimit(40);}}/> : null}
      <ul className={styles.list}>{choice?.path ? filteredDecls?.slice(0,limit).map((d,i) => <li key={i}>
        <button disabled={!visible} onClick={() => chooseLine(d)}><span>{d.name}</span><span>{d.sourceKind}</span></button>
      </li>) : filteredFiles?.slice(0,limit).map(f => {
        const name = f.path.split("/").at(-1)!;
        const provenance = [duplicateNames.has(name) && f.path.slice(0,-name.length-1),
          group.inline ? f.project : choice?.all && f.topic?.split(".").join(" › ")].filter(Boolean).join(" · ");
        return <li key={[f.project,f.path,f.topic].join("::")}><button title={f.path} aria-label={f.path}
          onClick={() => onChoose({all:choice?.all,topic:f.topic,project:f.project,path:f.path})}>
          <span>{name}{provenance && <small className={styles.fileProvenance}>{provenance}</small>}</span><span>{f.count.toLocaleString()}</span></button></li>;
      })}</ul>
      {q && count === 0 && <p>No matches.</p>}
      {count > limit && <button onClick={() => setLimit(n => n + 40)}>Show More {choice?.path ? "Declarations" : "Files"}</button>}
    </>}
  </div>;
}
