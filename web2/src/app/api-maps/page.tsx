import type { Metadata } from "next";
import { WikiPage } from "@/components/api-tracker/wiki-page";

export const metadata: Metadata = {
  title: "API Maps",
  alternates: { canonical: "/api-maps" },
  description: "Explore the physics in each folder, its formalized results, and its open claims.",
};

export default function Page() {
  return <WikiPage home="wiki" />;
}
