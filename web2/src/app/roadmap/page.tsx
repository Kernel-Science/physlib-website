import type { Metadata } from "next";
import { WikiPage } from "@/components/api-tracker/wiki-page";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Explore the physics roadmap by subject, folder, and Lean module.",
};

export default function Page() {
  return <WikiPage home="roadmap" />;
}
