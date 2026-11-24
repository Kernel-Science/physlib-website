import type { Metadata } from "next";
import { getApiMap } from "@/lib/yaml";
import { getWikiModuleReferences } from "@/lib/wiki-module-references";
import { CreateApiMap } from "@/components/api-tracker/create-api-map";

export const metadata: Metadata = {
  title: "Create an API Map",
  alternates: { canonical: "/api-maps/new" },
  description:
    "Start a new API Map for Physlib, in an existing part of the library or in a new area of physics.",
};

export default async function CreateApiMapPage() {
  const [apiMap, referencePaths] = await Promise.all([getApiMap(), getWikiModuleReferences()]);
  return (
    <div className="page-frame-tracker">
      <CreateApiMap apiMap={apiMap} referencePaths={referencePaths} />
    </div>
  );
}
