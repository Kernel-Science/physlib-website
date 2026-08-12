import { redirect } from "next/navigation";
import { getMonthEntries } from "@/lib/monthly-updates-months";

export default async function MonthlyUpdatesIndexPage() {
  const entries = await getMonthEntries();
  const target = entries.find((e) => e.data !== null) ?? entries[0];
  redirect(`/monthly-updates/${target.slug}`);
}
