// Pure, filesystem-free month range - safe to import from client components
// (e.g. the sidebar) as well as server code.

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

// The reporting window this site currently tracks. Extend the end date as
// new months are added - reports outside this range simply won't be listed.
const RANGE_START = { year: 2025, month: 8 };
const RANGE_END = { year: 2026, month: 7 };

function slugFor(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function labelFor(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** All months in the tracked range, newest first. */
export function monthRange(): MonthRangeEntry[] {
  const months: MonthRangeEntry[] = [];
  let { year, month } = RANGE_START;
  while (year < RANGE_END.year || (year === RANGE_END.year && month <= RANGE_END.month)) {
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
