import { audiences, impacts, values, visionPoints } from "@/lib/about-content";

/** The section pages use these under an h1, the About overview under an h2:
 *  `headingLevel` keeps the inner headings one level below either. */
type ContentProps = { headingLevel?: 2 | 3 };

export function MissionContent() {
  return (
    <div className="grid gap-x-16 gap-y-5 sm:grid-cols-2">
      {visionPoints.map((point, i) => (
        <div key={i} className="flex items-start gap-5">
          <span className="label-mono text-accent/50 flex-shrink-0 pt-0.5">
            {String(i + 1).padStart(2, "0")}
          </span>
          <p
            className="text-sm text-muted leading-relaxed"
            style={{ letterSpacing: "-0.01em" }}
          >
            {point}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ValuesContent({ headingLevel = 2 }: ContentProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className="divide-y divide-border border-t border-border">
      {values.map((v, i) => (
        <div
          key={v.title}
          className="grid grid-cols-[2.5rem_1fr] md:grid-cols-[3rem_16rem_1fr] gap-x-8 md:gap-x-12 py-8 items-start"
        >
          <span className="label-mono text-accent pt-1">
            {String(i + 1).padStart(2, "0")}
          </span>
          <Heading
            className="text-lg font-medium text-foreground"
            style={{ letterSpacing: "-0.025em" }}
          >
            {v.title}
          </Heading>
          <p
            className="col-start-2 md:col-start-3 mt-3 md:mt-0 text-sm text-muted leading-relaxed"
            style={{ letterSpacing: "-0.01em" }}
          >
            {v.body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BeneficiariesContent({ headingLevel = 2 }: ContentProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {audiences.map((a) => (
        <div
          key={a.title}
          className="rounded border border-border bg-background p-7 shadow-together"
        >
          <p className="label-mono text-muted mb-3">{a.tag}</p>
          <Heading
            className="text-xl font-medium text-foreground mb-6"
            style={{ letterSpacing: "-0.025em" }}
          >
            {a.title}
          </Heading>
          <ul className="space-y-4">
            {a.items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-4 text-sm text-muted"
                style={{ letterSpacing: "-0.01em" }}
              >
                <span className="flex-shrink-0 text-accent">—</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function ImpactContent() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {impacts.map((item, i) => (
        <div
          key={i}
          className="flex gap-5 rounded p-6 bg-background border border-border shadow-together"
        >
          <span
            className="text-2xl font-medium text-accent font-mono flex-shrink-0 leading-none tabular-nums"
            style={{ letterSpacing: "-0.04em" }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <p
            className="text-sm text-foreground/80 leading-relaxed"
            style={{ letterSpacing: "-0.01em" }}
          >
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}
