import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
  id?: string;
  headingLevel?: 2 | 3;
};

export function PageHeader({ title, description, className = "", id, headingLevel = 2 }: Props) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <header id={id} className={`border-t border-border pt-10 mb-6 scroll-mt-24 ${className}`}>
      <Heading
        className="text-2xl font-medium text-foreground"
        style={{ letterSpacing: "-0.04em" }}
      >
        {title}
      </Heading>
      {description && (
        <p className="mt-2 text-sm text-muted leading-relaxed" style={{ letterSpacing: "-0.01em" }}>
          {description}
        </p>
      )}
    </header>
  );
}
