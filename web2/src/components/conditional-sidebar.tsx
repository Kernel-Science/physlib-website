"use client";

import { usePathname } from "next/navigation";
import { TableOfContents } from "./table-of-contents";
import { MonthSidebar } from "./monthly-updates/month-sidebar";
import { ApiTrackerSidebar } from "./api-tracker/api-tracker-sidebar";
import { ReferencesSidebar } from "./references/references-sidebar";

export function ConditionalSidebar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (pathname.startsWith("/monthly-updates")) return <MonthSidebar />;
  if (pathname.startsWith("/api-tracker")) return <ApiTrackerSidebar />;
  if (pathname.startsWith("/references")) return <ReferencesSidebar />;
  return <TableOfContents />;
}
