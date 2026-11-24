import type { MetadataRoute } from "next";
import { getArchiveBounds } from "@/lib/monthly-updates-months";
import { monthRange } from "@/lib/monthly-updates-range";
import { navSections, site } from "@/lib/site";

// Pages worth indexing that are not navbar items.
const otherPages = ["/", "/faq", "/documentation-guide", "/search", "/wiki/new"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const navPages = navSections
    .flatMap((section) => section.items)
    .filter((item) => !item.external && !item.href.includes(".") && item.href !== "/monthly-updates")
    .map((item) => item.href);
  const months = monthRange(await getArchiveBounds()).map((m) => `/monthly-updates/${m.slug}`);
  return [...new Set([...otherPages, ...navPages, ...months])].map((path) => ({
    url: new URL(path, site.url).toString(),
  }));
}
