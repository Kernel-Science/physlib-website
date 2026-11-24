import type { Metadata } from "next";
import { getApiMap } from "@/lib/yaml";
import { CreateApiMap } from "@/components/api-tracker/create-api-map";

export const metadata: Metadata = {
  title: "Create a Wiki article",
  alternates: { canonical: "/wiki/new" },
  description:
    "Start a new Wiki article for Physlib, in an existing part of the library or in a new area of physics.",
};

export default async function CreateApiMapPage() {
  const apiMap = await getApiMap();
  return (
    <div className="page-frame-tracker">
      <CreateApiMap apiMap={apiMap} />
    </div>
  );
}
