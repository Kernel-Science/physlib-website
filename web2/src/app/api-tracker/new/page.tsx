import type { Metadata } from "next";
import { getApiMap } from "@/lib/yaml";
import { CreateApiMap } from "@/components/api-tracker/create-api-map";

export const metadata: Metadata = {
  title: "Create an API map | Physlib",
  description:
    "Start a new API map for Physlib, in an existing part of the library or in a new area of physics.",
};

export default async function CreateApiMapPage() {
  const apiMap = await getApiMap();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <CreateApiMap apiMap={apiMap} />
    </div>
  );
}
