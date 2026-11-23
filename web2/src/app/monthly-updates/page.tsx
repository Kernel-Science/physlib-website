import { redirect } from "next/navigation";
import { getArchiveBounds } from "@/lib/monthly-updates-months";

export default async function MonthlyUpdatesIndexPage() {
  const bounds = await getArchiveBounds();
  if (!bounds) return <p>No monthly reports have been published yet.</p>;
  redirect(`/monthly-updates/${bounds.last}`);
}
