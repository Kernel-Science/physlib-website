export type ArchiveBounds = { first: string; last: string };

export type MonthRangeEntry = {
  slug: string;
  label: string;
  /** Full month name, e.g. "June" - no year, for use in space-constrained UI. */
  monthName: string;
  year: number;
  month: number;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function slugFor(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function labelFor(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** All months in the tracked range, newest first. */
export function monthRange(bounds: ArchiveBounds | null): MonthRangeEntry[] {
  if (!bounds) return [];
  const months: MonthRangeEntry[] = [];
  let [year, month] = bounds.first.split("-").map(Number);
  const [endYear, endMonth] = bounds.last.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({
      slug: slugFor(year, month),
      label: labelFor(year, month),
      monthName: MONTH_NAMES_FULL[month - 1],
      year,
      month,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months.reverse();
}
