import type { Metadata } from "next";
import { WikiPage } from "@/components/api-tracker/wiki-page";

export const metadata: Metadata = {
  title: "Physlib Atlas",
  description: "Explore formalized physics by subject, read folder API Maps, and open Lean module documentation.",
};

export default function Page() {
  return <WikiPage home="roadmap" />;
}
