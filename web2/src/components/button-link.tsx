import { buttonVariants } from "@heroui/styles";
import NextLink from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { VariantProps } from "tailwind-variants";

type Variants = VariantProps<typeof buttonVariants>;

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> &
  Variants & {
    href: string;
    external?: boolean;
    children: ReactNode;
  };

export function ButtonLink({
  href,
  external,
  variant = "primary",
  size = "md",
  fullWidth,
  isIconOnly,
  className,
  children,
  ...props
}: Props) {
  const cls = buttonVariants({
    variant,
    size,
    fullWidth,
    isIconOnly,
    className: [className, "rounded-(--radius)"],
  });

  if (external || /^https?:/.test(href)) {
    return (
      <a
        href={href}
        target={props.target ?? "_blank"}
        rel={props.rel ?? "noopener noreferrer"}
        className={cls}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <NextLink href={href} className={cls} {...props}>
      {children}
    </NextLink>
  );
}
