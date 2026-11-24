import type { Metadata } from "next";
import { WikiPage } from "@/components/api-tracker/wiki-page";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Explore the physics roadmap and read the Wiki articles behind its folders and Lean modules.",
};

export default function Page() {
  return <WikiPage home="roadmap" />;
}
