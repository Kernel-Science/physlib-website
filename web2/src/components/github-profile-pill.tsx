import type { ReactNode } from "react";

type Props = {
  label: string;
  avatarUrl?: string | null;
  href?: string | null;
  lazyAvatar?: boolean;
  children?: ReactNode;
};

export function GitHubProfilePill({ label, avatarUrl, href, lazyAvatar, children }: Props) {
  const content = (
    <span className="inline-flex items-center gap-1.5 rounded-(--radius) border border-border bg-surface-secondary/60 pl-1 pr-2.5 py-1 text-xs text-foreground/80 hover:bg-surface-secondary transition-colors">
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          width={20}
          height={20}
          loading={lazyAvatar ? "lazy" : undefined}
          className="size-5 rounded-full"
        />
      )}
      <span className="font-medium">{label}</span>
      {children}
    </span>
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline">
      {content}
    </a>
  ) : content;
}
