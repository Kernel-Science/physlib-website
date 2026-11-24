import type { Metadata } from "next";
import { WikiPage } from "@/components/api-tracker/wiki-page";

export const metadata: Metadata = {
  title: "Physlib Wiki",
  description: "Read Physlib Wiki articles on physics topics and Lean modules from the Lean library.",
};

export default function Page() {
  return <WikiPage home="wiki" />;
}
