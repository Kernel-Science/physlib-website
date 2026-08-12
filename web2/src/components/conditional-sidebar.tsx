"use client";

import { usePathname } from "next/navigation";
import { TableOfContents } from "./table-of-contents";
import { MonthSidebar } from "./monthly-updates/month-sidebar";

export function ConditionalSidebar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname.startsWith("/monthly-updates")) return <MonthSidebar />;
  return <TableOfContents />;
}
