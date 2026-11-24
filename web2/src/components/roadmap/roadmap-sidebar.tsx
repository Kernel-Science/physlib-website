import Link from "next/link";
import styles from "./roadmap-sidebar.module.css";

export function RoadmapSidebar() {
  return <aside aria-label="Physlib Globe information" className={styles.sidebar}>
    <div className={styles.panel}>
      <div id="roadmap-inspector" className={styles.totals}/>
      <Link className={styles.link} href="/api-maps">API Maps <span aria-hidden="true">→</span></Link>
      <div id="roadmap-context" className={styles.context}/>
    </div>
  </aside>;
}
