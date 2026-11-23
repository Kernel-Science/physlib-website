"use client";

import { useRef, type CSSProperties } from "react";
import styles from "./dependency-subject-overview.module.css";

type SubjectImport = { name: string; count: number };
type Subject = {
  name: string;
  label: string;
  color: string;
  count: number;
  imports: SubjectImport[];
};

type Props = {
  subjects: Subject[];
  focusName: string;
  onFocusSubject: (name: string) => void;
};

function subjectColor(subject: Subject) {
  return { "--subject-color": subject.color } as CSSProperties;
}

function Connections({ links, incoming, onFocus }: {
  links: { subject: Subject; count: number }[];
  incoming: boolean;
  onFocus: (name: string) => void;
}) {
  const heading = incoming ? "Imports From" : "Imported By";
  return (
    <div className={incoming ? styles.incoming : styles.outgoing}>
      <h4 className={styles.columnTitle}>{heading}</h4>
      {links.length === 0 ? <p className={styles.empty}>No other subjects</p> : (
        <div className={styles.branch}>
          <ul className={styles.neighbors}>
            {links.map(({ subject, count }) => (
              <li key={subject.name}>
                <button type="button" onClick={() => onFocus(subject.name)} style={subjectColor(subject)}
                  title={`${count} direct module ${count === 1 ? "import" : "imports"}`}
                  aria-label={`Focus on ${subject.label}, ${count} direct ${count === 1 ? "import" : "imports"}`}>
                  <i aria-hidden="true" className={styles.dot} />
                  <span>{subject.label}</span>
                  <span className={styles.count}>{count}</span>
                </button>
              </li>
            ))}
          </ul>
          <svg className={styles.curves} viewBox={`0 0 48 ${links.length * 44}`} preserveAspectRatio="none" aria-hidden="true">
            {links.map(({ subject }, i) => {
              const lineY = (i + 0.5) * 44;
              const centerY = links.length * 22;
              const [from, to] = incoming ? [lineY, centerY] : [centerY, lineY];
              return (
                <path key={subject.name} d={`M0,${from} C22,${from} 26,${to} 48,${to}`}
                  fill="none" stroke={subject.color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

export function DependencySubjectOverview({ subjects, focusName, onFocusSubject }: Props) {
  const center = useRef<HTMLDivElement>(null);
  const ordered = [...subjects].sort((a, b) => a.label.localeCompare(b.label, "en"));
  const active = ordered.find(({ name }) => name === focusName) ?? ordered[0];
  if (!active) return null;

  const importsFrom = new Map(active.imports.map(({ name, count }) => [name, count]));
  const inputs = ordered.map((subject) => ({ subject, count: importsFrom.get(subject.name) ?? 0 }));
  const outputs = ordered.map((subject) => ({
    subject, count: subject.imports.find(({ name }) => name === active.name)?.count ?? 0,
  }));
  const connected = (items: typeof inputs) => items.filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || a.subject.label.localeCompare(b.subject.label, "en"));
  const focusNeighbor = (name: string) => {
    onFocusSubject(name);
    center.current?.focus({ preventScroll: true });
  };
  const moduleCount = `${active.count} ${active.count === 1 ? "module" : "modules"}`;

  return (
    <section className={styles.overview} aria-label="Subject dependency overview">
      <div className={styles.header}>
        <h2 id="subject-dependencies" className="scroll-mt-20">Subject Dependencies</h2>
        <a href="#module-graph" className={styles.full}><span aria-hidden="true">↑</span> Dependency Graph</a>
        <p>Choose a subject to expand its modules in the graph above and see what it imports and what depends on it.</p>
      </div>
      <div className={styles.flow} role="group" aria-label={`Dependencies of ${active.label}`}>
        <Connections links={connected(inputs)} incoming onFocus={focusNeighbor} />
        <div ref={center} role="group" tabIndex={-1} className={styles.active} style={subjectColor(active)}
          aria-label={`${active.label}, ${moduleCount}`}>
          <i className={styles.dot} aria-hidden="true" />
          <strong>{active.label}</strong>
          <span>{moduleCount}</span>
        </div>
        <Connections links={connected(outputs)} incoming={false} onFocus={focusNeighbor} />
      </div>
      <p className={styles.caption}>Arrows point from a prerequisite subject to the subject that imports it. Counts are direct module imports.</p>
      <div className={styles.index}>
        <h4 className={styles.indexTitle}>Explore by Subject <span>Modules</span></h4>
        <ul className={styles.subjects}>
          {ordered.map((subject) => (
            <li key={subject.name}>
              <button type="button" className={styles.choice} aria-pressed={active.name === subject.name}
                onClick={() => onFocusSubject(subject.name)} style={subjectColor(subject)}
                aria-label={`${subject.label}, ${subject.count} ${subject.count === 1 ? "module" : "modules"}`}>
                <i className={styles.dot} aria-hidden="true" />
                <span>{subject.label}</span>
                <span className={styles.count}>{subject.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
