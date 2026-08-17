import { cache } from "react";
import { getMonthlyUpdates, type MonthlyUpdate } from "./yaml";
import { monthRange } from "./monthly-updates-range";

export type MonthEntry = {
  slug: string;
  label: string;
  year: number;
  month: number;
  data: MonthlyUpdate | null;
};

/** Every tracked month, newest first, paired with its report data (or null
 *  if that month's report hasn't been generated yet).
 *
 *  Wrapped in React's `cache()` since both the layout and the `[slug]` page
 *  need this in the same request - without it, every one of the (growing)
 *  per-month JSON files would be read and parsed twice per page load. */
export const getMonthEntries = cache(async (): Promise<MonthEntry[]> => {
  const updates = await getMonthlyUpdates();
  const bySlug = new Map(updates.map((u) => [u.slug, u]));
  return monthRange().map((m) => ({ ...m, data: bySlug.get(m.slug) ?? null }));
});
