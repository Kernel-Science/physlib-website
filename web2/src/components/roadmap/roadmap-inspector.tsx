import type { RoadmapCounts } from "./roadmap-counts";
import { pretty, type Entry } from "./layout";
import styles from "./roadmap.module.css";
import sidebar from "./roadmap-sidebar.module.css";

const sources = ["Physlib", "PhyslibAlpha", "External"] as const;
const number = new Intl.NumberFormat("en-US");

export function RoadmapInspector({ entry, counts }: {
  entry?: Entry;
  counts: RoadmapCounts;
}) {
  const group = entry?.node.externalGroup;
  const title = entry && (group?.project ?? entry.node.externalProject?.repository ?? (
    entry.kind === "file" ? entry.node.name + ".lean"
      : entry.kind === "todos" ? "Unformalized" : pretty(entry.node.name)
  ));
  const included = sources.filter(source => counts[source] > 0);
  const total = counts.Physlib + counts.PhyslibAlpha + counts.External;
  const filePath = entry?.kind === "file" ? entry.node.path : undefined;
  const folders = filePath?.split(".").slice(0, -1).map(pretty).join(" › ");
  const breadcrumb = folders && title ? folders + " › " + title : undefined;
  return <section className={styles.inspectorStats} aria-label={title ?? "Map totals"} data-overall={entry ? undefined : true}>
    {title && (breadcrumb ? <h2 className={sidebar.fileBreadcrumb} aria-label={breadcrumb} title={breadcrumb}>
      <span className={sidebar.fileParents}>{folders} › </span>
      {title}
    </h2> : <h2>{title}</h2>)}
    <dl className={sidebar.sourceCounts}>
      {!entry && <div className={sidebar.countLine}>
        <dt>Total Declarations</dt><dd data-declaration-count={total}>{number.format(total)}</dd>
      </div>}
      {included.map(source => <div key={source}>
        <dt>{source}{entry && source !== "External" ? " Declarations" : ""}</dt><dd>{number.format(counts[source])}</dd>
      </div>)}
      {counts.UnformalizedClaims > 0 && <div><dt>Unformalized</dt><dd>{number.format(counts.UnformalizedClaims)}</dd></div>}
    </dl>
  </section>;
}
