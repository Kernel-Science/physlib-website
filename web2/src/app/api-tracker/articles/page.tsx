import { redirect } from "next/navigation";

export default async function LegacyArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.append(key, value);
    else value?.forEach((item) => query.append(key, item));
  }
  const search = query.toString();
  // A Location without a fragment inherits the original article's fragment.
  redirect(`/wiki${search ? `?${search}` : ""}`);
}
