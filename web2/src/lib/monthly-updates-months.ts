import { readdir } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { getMonthlyUpdates, type MonthlyUpdate } from "./yaml";
import { monthRange, type ArchiveBounds } from "./monthly-updates-range";

/** Only filenames are needed to build the sidebar and static routes. */
export const getArchiveBounds = cache(async (): Promise<ArchiveBounds | null> => {
  let files: string[];
  try {
    files = await readdir(path.join(process.cwd(), "data", "monthly-updates"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const months = files
    .filter((name) => /^\d{4}-(0[1-9]|1[0-2])\.json$/.test(name))
    .map((name) => name.slice(0, 7))
    .sort();
  return months.length ? { first: months[0], last: months[months.length - 1] } : null;
});

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
 *  Wrapped in React's `cache()` since the metadata and detail page
 *  need this in the same request - without it, every one of the (growing)
 *  per-month JSON files would be read and parsed twice per page load. */
export const getMonthEntries = cache(async (): Promise<MonthEntry[]> => {
  const [updates, bounds] = await Promise.all([getMonthlyUpdates(), getArchiveBounds()]);
  const bySlug = new Map(updates.map((u) => [u.slug, u]));
  return monthRange(bounds).map((m) => ({ ...m, data: bySlug.get(m.slug) ?? null }));
});
