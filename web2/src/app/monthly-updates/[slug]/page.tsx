import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMonthEntries } from "@/lib/monthly-updates-months";
import { MonthDetail } from "@/components/monthly-updates/month-detail";
import { MonthPending } from "@/components/monthly-updates/month-pending";

export async function generateStaticParams() {
  const entries = await getMonthEntries();
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entries = await getMonthEntries();
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) return {};
  return {
    title: `${entry.label} Update | Physlib`,
    description: `Monthly changelog of new definitions, theorems, and lemmas added to Physlib in ${entry.label}.`,
  };
}

export default async function MonthlyUpdateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entries = await getMonthEntries();
  const entry = entries.find((e) => e.slug === slug);

  if (!entry) notFound();

  return entry.data ? <MonthDetail data={entry.data} /> : <MonthPending label={entry.label} />;
}
