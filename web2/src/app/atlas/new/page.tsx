import type { Metadata } from "next";
import { getAtlas } from "@/lib/yaml";
import { CreateAtlas } from "@/components/atlas/create-atlas";

export const metadata: Metadata = {
  title: "Create an Atlas article | Physlib",
  description:
    "Start a new Atlas article for Physlib, in an existing part of the library or in a new area of physics.",
};

export default async function CreateAtlasPage() {
  const atlas = await getAtlas();
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <CreateAtlas atlas={atlas} />
    </div>
  );
}
