import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  id?: string;
  headingLevel?: 2 | 3;
  /** Step number, shown in the site's blue monospace style beside the title.
   *  It sits outside the heading element, so "On this page" lists the title
   *  without it. */
  number?: number;
};

export function PageHeader({ title, description, className = "", id, headingLevel = 2, number }: Props) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <header
      id={id}
      className={`${headingLevel === 3 ? "pt-2 mb-4" : "border-t border-border pt-10 mb-6"} scroll-mt-24 ${className}`}
    >
      <div className={number === undefined ? undefined : "flex items-baseline gap-3"}>
        {number !== undefined && (
          <span className="shrink-0 font-mono text-sm font-medium text-accent" aria-hidden="true">
            {String(number).padStart(2, "0")}
          </span>
        )}
        <Heading
          className={`${headingLevel === 3 ? "text-lg" : "text-2xl"} font-medium text-foreground`}
          style={{ letterSpacing: headingLevel === 3 ? "-0.025em" : "-0.04em" }}
        >
          {title}
        </Heading>
      </div>
      {description && (
        <p className="mt-2 text-sm text-muted leading-relaxed" style={{ letterSpacing: "-0.01em" }}>
          {description}
        </p>
      )}
    </header>
  );
}
