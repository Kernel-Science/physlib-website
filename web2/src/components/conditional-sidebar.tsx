"use client";

import { usePathname } from "next/navigation";
import { TableOfContents } from "./table-of-contents";

export function ConditionalSidebar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <TableOfContents />;
}
