import { NextResponse } from "next/server";
import { getAtlas } from "@/lib/yaml";

// The sidebar mounts outside the /atlas page tree (it's rendered by
// ConditionalSidebar at the root layout, see the design-language skill), so
// it can't receive the page's server-fetched props and needs its own way to
// reach data/Atlas.json client-side. It only draws the tree, so it gets the
// maps without their text and Lean references.
export async function GET() {
  const atlas = await getAtlas();
  return NextResponse.json({
    ...atlas,
    directories: [],
    nodes: atlas.nodes.map((n) => ({
      ...n,
      abstract: "",
      content: [],
      leanReferences: [],
      references: [],
    })),
  });
}
